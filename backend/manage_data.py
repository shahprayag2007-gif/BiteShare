"""
FoodBridge Database Management & Custom Data Import Tool
Usage:
    python manage_data.py --status             (Show current database record counts)
    python manage_data.py --clear-listings     (Wipe demo food listings & claims only)
    python manage_data.py --clear-all          (Wipe everything: listings, users, NGOs, colleges)
    python manage_data.py --import-custom      (Execute database/custom_data_template.sql)
    python manage_data.py --restore-demo       (Restore original DBMS seed demo data)
"""

import sys
import os
import argparse
from db import get_db, get_active_db_type, fetch_all, fetch_one

def show_status():
    db_type = get_active_db_type()
    print("=" * 60)
    print(f"DATABASE STATUS: {db_type.upper()}")
    print("=" * 60)
    if db_type == "mock":
        print("Database offline. Running in in-memory mock mode.")
        return

    tables = ["universities", "users", "ngos", "food_listings", "claims", "notifications"]
    for t in tables:
        res = fetch_one(f"SELECT COUNT(*) AS c FROM {t}")
        count = res["c"] if res else 0
        print(f"  * {t.ljust(18)} : {count} row(s)")
    print("=" * 60)

def clear_listings_only():
    db_type = get_active_db_type()
    if db_type != "postgresql":
        print(f"Active DB is {db_type}. This operation is supported on PostgreSQL.")
        return

    confirm = input("Are you sure you want to clear all food listings, claims, and notifications? (y/N): ")
    if confirm.lower() != 'y':
        print("Cancelled.")
        return

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE claims, notifications, food_listings RESTART IDENTITY CASCADE;")
            conn.commit()
    print("[OK] Successfully cleared all food listings, claims, and notifications!")
    print("You can now post your own surplus food listings from the Student and Canteen dashboards.")
    show_status()

def clear_all():
    db_type = get_active_db_type()
    if db_type != "postgresql":
        print(f"Active DB is {db_type}. This operation is supported on PostgreSQL.")
        return

    confirm = input("WARNING: This will delete ALL universities, users, NGOs, and food listings! Proceed? (y/N): ")
    if confirm.lower() != 'y':
        print("Cancelled.")
        return

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE claims, notifications, food_listings, users, ngos, universities RESTART IDENTITY CASCADE;")
            conn.commit()
    print("[OK] All tables truncated cleanly.")
    show_status()

def import_custom_sql():
    sql_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "custom_data_template.sql"))
    if not os.path.exists(sql_path):
        print(f"Error: Could not find {sql_path}")
        return

    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    print(f"Importing {sql_path} into PostgreSQL campus_food_db...")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql_content)
            conn.commit()
    print("[OK] Custom data template successfully imported!")
    show_status()

def restore_demo():
    sql_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "postgres_seed_data.sql"))
    if not os.path.exists(sql_path):
        print(f"Error: Could not find {sql_path}")
        return

    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE claims, notifications, food_listings, users, ngos, universities RESTART IDENTITY CASCADE;")
            cur.execute(sql_content)
            conn.commit()
    print("[OK] Single-city demo seed data restored!")
    show_status()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FoodBridge Database Manager")
    parser.add_argument("--status", action="store_true", help="Show row counts for all tables")
    parser.add_argument("--clear-listings", action="store_true", help="Clear only food listings & claims")
    parser.add_argument("--clear-all", action="store_true", help="Clear entire database")
    parser.add_argument("--import-custom", action="store_true", help="Execute database/custom_data_template.sql")
    parser.add_argument("--restore-demo", action="store_true", help="Restore default demo data")

    args = parser.parse_args()

    if args.clear_listings:
        clear_listings_only()
    elif args.clear_all:
        clear_all()
    elif args.import_custom:
        import_custom_sql()
    elif args.restore_demo:
        restore_demo()
    else:
        show_status()
