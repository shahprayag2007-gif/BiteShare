"""
Excel Importer for FoodBridge PostgreSQL Database
Imports sheets: Universities, Users, NGOs, FoodListings
Usage:
    python import_excel.py [optional_path_to_excel]
"""

import sys
import os
import openpyxl
from db import get_db, get_active_db_type, fetch_one

def import_from_excel(excel_path=None):
    if not excel_path:
        excel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "foodbridge_template.xlsx"))

    if not os.path.exists(excel_path):
        print(f"Error: Excel file not found at: {excel_path}")
        return False

    print(f"Loading workbook: {excel_path}...")
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    db_type = get_active_db_type()
    if db_type != "postgresql":
        print(f"Active DB is {db_type}. This importer requires PostgreSQL.")
        return False

    with get_db() as conn:
        with conn.cursor() as cur:
            # 1. Clear existing data
            print("Clearing old data in PostgreSQL...")
            cur.execute("TRUNCATE claims, notifications, food_listings, users, ngos, universities RESTART IDENTITY CASCADE;")

            # 2. Import Universities
            if "Universities" in wb.sheetnames:
                ws = wb["Universities"]
                rows = list(ws.iter_rows(values_only=True))
                if len(rows) > 1:
                    u_count = 0
                    for r in rows[1:]:
                        if not r or not r[1]: continue
                        uid, name, code, city, state, pin, addr, email, phone = r[:9]
                        cur.execute("""
                            INSERT INTO universities (university_id, name, short_code, city, state, pincode, address, contact_email, contact_phone)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (university_id) DO UPDATE SET name = EXCLUDED.name;
                        """, (uid, str(name).strip(), str(code).strip(), str(city or 'City').strip(), str(state or 'State').strip(), str(pin or '560001').strip(), str(addr or 'Campus').strip(), str(email).strip().lower(), str(phone or '+91 9800000000').strip()))
                        u_count += 1
                    cur.execute("SELECT setval('universities_university_id_seq', COALESCE((SELECT MAX(university_id) FROM universities), 1));")
                    print(f"  * Universities imported: {u_count}")

            # 3. Import Users
            if "Users" in wb.sheetnames:
                ws = wb["Users"]
                rows = list(ws.iter_rows(values_only=True))
                if len(rows) > 1:
                    usr_count = 0
                    for r in rows[1:]:
                        if not r or not r[2]: continue
                        uid, univ_id, full_name, email, pwd, phone, role, campus_id = r[:8]
                        clean_role = str(role).strip().lower().replace(" (student/canteen_staff)", "")
                        if "canteen" in clean_role: clean_role = "canteen_staff"
                        elif "admin" in clean_role: clean_role = "campus_admin"
                        else: clean_role = "student"

                        cur.execute("""
                            INSERT INTO users (user_id, university_id, full_name, email, password_hash, phone, role, student_or_staff_id, is_active)
                            VALUES (%s, %s, %s, %s, %s, %s, %s::user_role, %s, TRUE)
                            ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;
                        """, (uid, univ_id, str(full_name).strip(), str(email).strip().lower(), str(pwd or 'password123').strip(), str(phone or '+91 9800000000').strip(), clean_role, str(campus_id).strip() if campus_id else None))
                        usr_count += 1
                    cur.execute("SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 1));")
                    print(f"  * Users imported: {usr_count}")

            # 4. Import NGOs
            if "NGOs" in wb.sheetnames:
                ws = wb["NGOs"]
                rows = list(ws.iter_rows(values_only=True))
                if len(rows) > 1:
                    ngo_count = 0
                    for r in rows[1:]:
                        if not r or not r[1]: continue
                        nid, name, reg_no, contact, email, pwd, phone, city, state, pin, addr = r[:11]
                        cur.execute("""
                            INSERT INTO ngos (ngo_id, name, registration_number, contact_person, email, password_hash, phone, city, state, pincode, address, is_verified)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                            ON CONFLICT (ngo_id) DO UPDATE SET name = EXCLUDED.name;
                        """, (nid, str(name).strip(), str(reg_no).strip(), str(contact or 'Lead').strip(), str(email).strip().lower(), str(pwd or 'password123').strip(), str(phone or '+91 9800000000').strip(), str(city or 'City').strip(), str(state or 'State').strip(), str(pin or '560001').strip(), str(addr or 'Office').strip()))
                        ngo_count += 1
                    cur.execute("SELECT setval('ngos_ngo_id_seq', COALESCE((SELECT MAX(ngo_id) FROM ngos), 1));")
                    print(f"  * NGOs imported: {ngo_count}")

            # 5. Import Food Listings (Optional)
            if "FoodListings" in wb.sheetnames:
                ws = wb["FoodListings"]
                rows = list(ws.iter_rows(values_only=True))
                if len(rows) > 1:
                    l_count = 0
                    for idx, r in enumerate(rows[1:], 1):
                        if not r or not r[0]: continue
                        title, univ_id, donor_id, cat, src, qty, desc, loc = r[:8]
                        clean_cat = str(cat or 'cooked_meal').strip().lower()
                        if "pack" in clean_cat: clean_cat = "packed_food"
                        elif "bake" in clean_cat: clean_cat = "bakery_snacks"
                        else: clean_cat = "cooked_meal"

                        clean_src = str(src or 'canteen').strip().lower()
                        if "tiffin" in clean_src or "student" in clean_src: clean_src = "student_tiffin"
                        elif "mess" in clean_src: clean_src = "hostel_mess"
                        else: clean_src = "canteen"

                        cur.execute("""
                            INSERT INTO food_listings (
                                university_id, donor_id, food_title, food_category, food_source,
                                quantity_servings, description, prepared_time, expiry_time, pickup_location, status
                            ) VALUES (
                                %s, %s, %s, %s::food_category_type, %s::food_source_type,
                                %s, %s, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '5 hour', %s, 'available'
                            );
                        """, (univ_id, donor_id, str(title).strip(), clean_cat, clean_src, int(qty or 10), str(desc or '').strip(), str(loc or 'Campus Desk').strip()))
                        l_count += 1
                    print(f"  * Food listings imported: {l_count}")

            conn.commit()

    print("=" * 60)
    print("SUCCESS: Excel workbook data imported into PostgreSQL campus_food_db!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    path_arg = sys.argv[1] if len(sys.argv) > 1 else None
    import_from_excel(path_arg)
