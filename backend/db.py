"""
Database connection handler supporting PostgreSQL (pgAdmin) and MySQL.
Auto-detects active database engines and falls back to demo mode if credentials are unconfigured.
"""

import os
from typing import Optional, Dict, Any, List

# PostgreSQL settings (pgAdmin 4 default port is 5432)
PG_CONFIG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "port": int(os.getenv("PG_PORT", 5432)),
    "user": os.getenv("PG_USER", "postgres"),
    "password": os.getenv("PG_PASSWORD", "admin"), # pgAdmin password
    "database": os.getenv("PG_NAME", "campus_food_db")
}

# MySQL settings (fallback if user is using MySQL/phpMyAdmin)
MYSQL_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "campus_food_db"),
    "charset": "utf8mb4"
}

# In-memory mock entities (Operating City: Ahmedabad)
MOCK_UNIVERSITIES = [
    {"university_id": 1, "name": "Nirma University", "short_code": "NU", "address": "Sarkhej - Gandhinagar Highway, Gota", "city": "Ahmedabad", "state": "Gujarat", "pincode": "382481", "contact_email": "info@nirmauni.ac.in", "contact_phone": "+91 79 7165 2000"},
    {"university_id": 2, "name": "Adani University", "short_code": "AU", "address": "Shantigram Township, Near Vaishnodevi Circle, SG Highway", "city": "Ahmedabad", "state": "Gujarat", "pincode": "382421", "contact_email": "info@adaniuni.ac.in", "contact_phone": "+91 79 2555 6592"},
    {"university_id": 3, "name": "LJ University", "short_code": "LJU", "address": "Near Sarkhej-Sanand Circle, S.G. Road, Makarba", "city": "Ahmedabad", "state": "Gujarat", "pincode": "382210", "contact_email": "info@ljku.edu.in", "contact_phone": "+91 79 2970 8030"},
    {"university_id": 4, "name": "LD College of Engineering", "short_code": "LDC", "address": "Opp. Gujarat University, 120 Circular Road, Navrangpura", "city": "Ahmedabad", "state": "Gujarat", "pincode": "380015", "contact_email": "ldce-abad-dte@gujarat.gov.in", "contact_phone": "+91 79 2630 6752"},
    {"university_id": 5, "name": "Ahmedabad University", "short_code": "AHMU", "address": "Commerce Six Roads, Navrangpura", "city": "Ahmedabad", "state": "Gujarat", "pincode": "380009", "contact_email": "info@ahduni.edu.in", "contact_phone": "+91 79 6191 1000"},
    {"university_id": 6, "name": "Vishwakarma Government Engineering College (VGEC)", "short_code": "VGEC", "address": "Nr. Visat Three Roads, Sabarmati-Koba Highway, Chandkheda", "city": "Ahmedabad", "state": "Gujarat", "pincode": "382424", "contact_email": "est@vgecg.ac.in", "contact_phone": "+91 79 2329 3866"},
    {"university_id": 7, "name": "Indus University", "short_code": "IU", "address": "Rancharda, Via Thaltej, Shilaj", "city": "Ahmedabad", "state": "Gujarat", "pincode": "382115", "contact_email": "info@indusuni.ac.in", "contact_phone": "+91 2764 260277"}
]

MOCK_USERS = [
    {"user_id": 1, "university_id": 1, "full_name": "Rushirajsinh Vala", "email": "rushirajvala@gmail.com", "role": "student", "student_or_staff_id": "uni-001", "password_hash": "password123"},
    {"user_id": 2, "university_id": 1, "full_name": "Dharmik Modha", "email": "modhabrothers@yahoo.com", "role": "canteen_staff", "student_or_staff_id": "staff-001", "password_hash": "password123"},
    {"user_id": 3, "university_id": 2, "full_name": "Jay Davera", "email": "jayhay@gmail.com", "role": "student", "student_or_staff_id": "uni-002", "password_hash": "password123"},
    {"user_id": 4, "university_id": 2, "full_name": "Bhavya Modha", "email": "bhavyam@gmail.com", "role": "canteen_staff", "student_or_staff_id": "staff-002", "password_hash": "password123"},
    {"user_id": 5, "university_id": 3, "full_name": "Ruchit Karnavat", "email": "rkkarnavat@yahoo.com", "role": "student", "student_or_staff_id": "uni-003", "password_hash": "password123"},
    {"user_id": 6, "university_id": 4, "full_name": "Prayag Shah", "email": "prayag23@gmail.com", "role": "student", "student_or_staff_id": "uni-004", "password_hash": "password123"},
    {"user_id": 7, "university_id": 5, "full_name": "Smit Mangukiya", "email": "smitsm34@gmail.com", "role": "student", "student_or_staff_id": "uni-005", "password_hash": "password123"},
    {"user_id": 8, "university_id": 6, "full_name": "Dhyan Patel", "email": "dhyanpatelsp@gmail.com", "role": "canteen_staff", "student_or_staff_id": "staff-003", "password_hash": "password123"},
    {"user_id": 9, "university_id": 7, "full_name": "Jainish Shah", "email": "jainishshah@yahoo.com", "role": "canteen_staff", "student_or_staff_id": "staff-004", "password_hash": "password123"},
    {"user_id": 10, "university_id": 5, "full_name": "Dadhichi Patel", "email": "dadhipatel@gmail.com", "role": "canteen_staff", "student_or_staff_id": "staff-005", "password_hash": "password123"}
]

MOCK_NGOS = [
    {"ngo_id": 1, "name": "Robin Hood Army Ahmedabad", "registration_number": "RHA-GJ-2018-9901", "address": "SG Highway Distribution Hub, Bodakdev", "email": "robinhood@food.org", "password_hash": "password123", "city": "Ahmedabad", "state": "Gujarat", "pincode": "380054", "phone": "+91 98888 12345"},
    {"ngo_id": 2, "name": "Feed The Need Ahmedabad", "registration_number": "FTN-GJ-2020-4122", "address": "Near Vastrapur Lake, Vastrapur", "email": "contactfood@ahmedabad.org", "password_hash": "password123", "city": "Ahmedabad", "state": "Gujarat", "pincode": "380015", "phone": "+91 98888 12346"},
    {"ngo_id": 3, "name": "Annashetra Ahmedabad", "registration_number": "AA-GJ-2018-9902", "address": "Opp. VS Hospital, Ellisbridge, Ashram Road", "email": "ahmedabadanna@gmail.com", "password_hash": "password123", "city": "Ahmedabad", "state": "Gujarat", "pincode": "380006", "phone": "+91 98888 12347"},
    {"ngo_id": 4, "name": "Roti Bank Ahmedabad", "registration_number": "RBA-GJ-2020-4123", "address": "Near Municipal Market, C.G. Road, Navrangpura", "email": "rotibank@ahmedabad.org", "password_hash": "password123", "city": "Ahmedabad", "state": "Gujarat", "pincode": "380009", "phone": "+91 98888 12348"},
    {"ngo_id": 5, "name": "ISCON Food Relief Foundation", "registration_number": "IFRA-GJ-2018-9903", "address": "ISKCON Temple Campus, Sarkhej - Gandhinagar Hwy, Satellite", "email": "isconfood@ngo.org", "password_hash": "password123", "city": "Ahmedabad", "state": "Gujarat", "pincode": "380059", "phone": "+91 98888 12349"}
]

def get_active_db_type() -> str:
    """Detects whether PostgreSQL (pgAdmin) or MySQL is active."""
    # Check PostgreSQL first
    try:
        import psycopg2
        conn = psycopg2.connect(
            host=PG_CONFIG["host"],
            port=PG_CONFIG["port"],
            user=PG_CONFIG["user"],
            password=PG_CONFIG["password"],
            dbname=PG_CONFIG["database"]
        )
        conn.close()
        return "postgresql"
    except Exception:
        pass

    # Check MySQL
    try:
        import pymysql
        conn = pymysql.connect(**MYSQL_CONFIG)
        conn.close()
        return "mysql"
    except Exception:
        pass

    return "mock"

def check_mysql_connection() -> bool:
    return get_active_db_type() in ("postgresql", "mysql")

def get_db():
    db_type = get_active_db_type()
    if db_type == "postgresql":
        import psycopg2
        import psycopg2.extras
        return psycopg2.connect(
            host=PG_CONFIG["host"],
            port=PG_CONFIG["port"],
            user=PG_CONFIG["user"],
            password=PG_CONFIG["password"],
            dbname=PG_CONFIG["database"],
            cursor_factory=psycopg2.extras.RealDictCursor
        )
    elif db_type == "mysql":
        import pymysql
        import pymysql.cursors
        return pymysql.connect(
            **MYSQL_CONFIG,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
    raise ConnectionError("No active database configured. Operating in mock demo mode.")

def fetch_all(query: str, params: tuple = None) -> Optional[List[Dict[str, Any]]]:
    db_type = get_active_db_type()
    if db_type == "postgresql":
        # Adjust parameter syntax from %s to %s (both psycopg2 and pymysql use %s)
        try:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, params or ())
                    return [dict(row) for row in cur.fetchall()]
        except Exception as e:
            print("PostgreSQL Query Error:", e)
            return None
    elif db_type == "mysql":
        try:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, params or ())
                    return cur.fetchall()
        except Exception as e:
            print("MySQL Query Error:", e)
            return None
    return None

def fetch_one(query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
    db_type = get_active_db_type()
    if db_type in ("postgresql", "mysql"):
        try:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, params or ())
                    row = cur.fetchone()
                    return dict(row) if row else None
        except Exception as e:
            print("Database Query Error:", e)
            return None
    return None
