# Connecting pgAdmin 4 to the Campus Food Redistribution Project

Your computer has **PostgreSQL 18** running as a Windows service! pgAdmin 4 is the visual management dashboard for PostgreSQL.

Follow these 5 simple steps to connect pgAdmin 4 to this project:

---

## Step 1: Open pgAdmin 4
1. Press the `Windows Key`, search for **pgAdmin 4**, and click to launch it.
2. Under **Servers** on the left tree, click on **PostgreSQL 18** (or your local server).
3. If prompted, enter the master password you chose when you installed PostgreSQL.

---

## Step 2: Create the Database in pgAdmin
1. Right-click on **Databases** under PostgreSQL.
2. Select **Create** &rarr; **Database...**
3. In the **Database** field, type:
   ```text
   campus_food_db
   ```
4. Click **Save**.

---

## Step 3: Run the Schema & Triggers in pgAdmin
1. In pgAdmin's left sidebar, click on **campus_food_db** to select it.
2. In the top navigation bar of pgAdmin, click **Tools** &rarr; **Query Tool** (or click the database icon with a lightning bolt/play icon).
3. Open or copy the script from:
   - File path: `campus-food-redistribution/database/postgres_schema.sql`
4. Paste the SQL into the Query Editor.
5. Click the **Execute (▶ or F5)** button.
   > You will see: *"Query returned successfully in ... msec"*. All 6 tables, triggers, and views are now created!

---

## Step 4: Run the Sample Seed Data
1. Clear the Query Tool editor or open a new Query tab.
2. Open or copy the script from:
   - File path: `campus-food-redistribution/database/postgres_seed_data.sql`
3. Paste it into the Query Editor and press **Execute (▶ or F5)**.
   > This inserts sample colleges (NIT Bengaluru, DTU Delhi, Pune City Univ), student donors, NGOs, and food listings.

---

## Step 5: Connect the Python Backend to pgAdmin
1. Open the file **`campus-food-redistribution/backend/db.py`** (or `backend/.env`).
2. Update the `PG_CONFIG` section with the password you use to log into pgAdmin:
   ```python
   PG_CONFIG = {
       "host": "localhost",
       "port": 5432,
       "user": "postgres",
       "password": "YOUR_PGADMIN_PASSWORD",  # <--- Change this to your password
       "database": "campus_food_db"
   }
   ```
3. Save the file.
4. The website at **`http://127.0.0.1:8000`** will automatically detect the database and show:
   **`🟢 PostgreSQL (pgAdmin) Live`**!

---

## Bonus: View the Visual ER Diagram inside pgAdmin
pgAdmin 4 has a built-in visual ER diagram generator:
1. In pgAdmin, right-click on your database: **campus_food_db**.
2. Click **Generate ERD** (Entity Relationship Diagram).
3. pgAdmin will automatically render the visual ER diagram with primary keys, foreign keys, and relations! You can export this directly for your DBMS project report or presentation slides.
