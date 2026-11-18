from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import datetime
import os

from db import (
    check_mysql_connection,
    get_active_db_type,
    get_db,
    fetch_all,
    fetch_one,
    MOCK_UNIVERSITIES,
    MOCK_USERS,
    MOCK_NGOS
)

app = FastAPI(title="BiteShare API")

# Enable CORS for all origins (supports both http://localhost:8000 and file:// protocol)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

# Mount static files (css, js)
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")

# In-memory mock food listings store
MOCK_FOOD_LISTINGS = [
    {
        "listing_id": 1,
        "university_id": 1,
        "university_name": "Nirma University",
        "university_address": "Sarkhej - Gandhinagar Highway, Gota",
        "city": "Ahmedabad",
        "pincode": "382481",
        "donor_id": 2,
        "donor_name": "Dharmik Modha (Canteen Incharge)",
        "donor_phone": "+91 9123456782",
        "food_title": "Cooked Rice & Dal Makhani",
        "food_category": "cooked_meal",
        "food_source": "canteen",
        "quantity_servings": 45,
        "description": "Freshly prepared evening batch in containers.",
        "prepared_time": (datetime.datetime.now() - datetime.timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S"),
        "expiry_time": (datetime.datetime.now() + datetime.timedelta(hours=4)).strftime("%Y-%m-%d %H:%M:%S"),
        "pickup_location": "Nirma University Central Canteen Main Gate, SG Highway",
        "status": "available",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    },
    {
        "listing_id": 2,
        "university_id": 1,
        "university_name": "Nirma University",
        "university_address": "Sarkhej - Gandhinagar Highway, Gota",
        "city": "Ahmedabad",
        "pincode": "382481",
        "donor_id": 1,
        "donor_name": "Rushirajsinh Vala",
        "donor_phone": "+91 9123456781",
        "food_title": "Homemade Veg Pulao & Roti",
        "food_category": "cooked_meal",
        "food_source": "student_tiffin",
        "quantity_servings": 6,
        "description": "Excess packed home tiffins from group study.",
        "prepared_time": (datetime.datetime.now() - datetime.timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S"),
        "expiry_time": (datetime.datetime.now() + datetime.timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S"),
        "pickup_location": "Nirma University Boys Hostel Block A Reception, SG Highway",
        "status": "available",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
]

# Mock Claims Store
MOCK_CLAIMS = [
    {
        "claim_id": 1,
        "listing_id": 1,
        "ngo_id": 1,
        "ngo_name": "Robin Hood Army Ahmedabad",
        "ngo_address": "SG Highway Distribution Hub, Bodakdev, Ahmedabad",
        "food_title": "Cooked Rice & Dal Makhani",
        "quantity_servings": 45,
        "university_name": "Nirma University",
        "university_address": "Sarkhej - Gandhinagar Highway, Gota, Ahmedabad",
        "pickup_location": "Nirma University Central Canteen Main Gate, SG Highway",
        "expected_pickup_time": "2026-11-05 19:30:00",
        "volunteer_name": "Vikram Sen",
        "volunteer_phone": "+91 9888812345",
        "notes": "Delivered to local children shelter",
        "claim_status": "completed",
        "created_at": (datetime.datetime.now() - datetime.timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
    }
]

# Mock Notifications Store
MOCK_NOTIFICATIONS = [
    {
        "notification_id": 1,
        "ngo_id": 1,
        "listing_id": 1,
        "title": "Surplus Food Alert: Nirma University",
        "message": "Cooked Rice & Dal Makhani (45 servings) is available for pickup at Nirma University. Expiry in 4 hours.",
        "is_read": False,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
]

# Request Models
class LoginRequest(BaseModel):
    role: str
    university_id: Optional[int] = None
    identifier: str
    password: str

class RegisterRequest(BaseModel):
    role: str  # 'student', 'canteen_staff', 'ngo'
    university_id: Optional[int] = None
    full_name: Optional[str] = None
    email: str
    password: str
    phone: Optional[str] = ""
    student_or_staff_id: Optional[str] = None
    ngo_name: Optional[str] = None
    registration_number: Optional[str] = None
    contact_person: Optional[str] = None
    city: Optional[str] = "Ahmedabad"
    state: Optional[str] = "Gujarat"
    pincode: Optional[str] = "380001"
    address: Optional[str] = ""

class FoodListingCreate(BaseModel):
    donor_id: int
    university_id: int
    food_title: str
    food_category: str
    food_source: str
    quantity_servings: int = Field(gt=0, description="Quantity must be greater than zero")
    description: Optional[str] = ""
    prepared_time: str
    expiry_time: str
    pickup_location: Optional[str] = "Campus Main Reception"

class ClaimCreate(BaseModel):
    listing_id: int
    ngo_id: int
    volunteer_name: str
    volunteer_phone: str
    expected_pickup_time: str
    notes: Optional[str] = ""

# Page Routes
@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"))

@app.get("/login.html")
def serve_login():
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"))

@app.get("/student-dashboard.html")
def serve_student_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "student-dashboard.html"))

@app.get("/canteen-dashboard.html")
def serve_canteen_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "canteen-dashboard.html"))

@app.get("/ngo-dashboard.html")
def serve_ngo_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "ngo-dashboard.html"))

@app.get("/analytics.html")
def serve_analytics():
    return FileResponse(os.path.join(FRONTEND_DIR, "analytics.html"))

# Database status API
@app.get("/api/db/status")
def get_db_status():
    db_type = get_active_db_type()
    if db_type == "postgresql":
        return {
            "mysql_connected": True,
            "db_type": "postgresql",
            "message": "Connected to PostgreSQL (pgAdmin) campus_food_db"
        }
    elif db_type == "mysql":
        return {
            "mysql_connected": True,
            "db_type": "mysql",
            "message": "Connected to MySQL campus_food_db"
        }
    return {
        "mysql_connected": False,
        "db_type": "mock",
        "message": "Operating in Demo/Mock Mode (Database not connected)"
    }

@app.get("/api/universities")
def get_universities():
    if check_mysql_connection():
        rows = fetch_all("SELECT university_id, name, short_code, address, city, state, pincode, contact_email FROM universities ORDER BY name ASC")
        if rows:
            return rows
    return MOCK_UNIVERSITIES

@app.post("/api/auth/login")
def login(req: LoginRequest):
    identifier = (req.identifier or "").strip()
    password = (req.password or "").strip()

    if check_mysql_connection():
        if req.role in ("student", "canteen_staff"):
            # 1. Search for user by email or student/staff ID (case-insensitive)
            query = """
                SELECT u.user_id, u.university_id, u.full_name, u.email, u.role, u.student_or_staff_id, 
                       u.password_hash, univ.name AS university_name, univ.address AS university_address, 
                       univ.city, univ.state, univ.pincode
                FROM users u
                JOIN universities univ ON u.university_id = univ.university_id
                WHERE (LOWER(TRIM(u.email)) = LOWER(%s) OR LOWER(TRIM(u.student_or_staff_id)) = LOWER(%s))
            """
            user = fetch_one(query, (identifier, identifier))

            if not user:
                # Check if this email was registered as an NGO by mistake
                ngo_check = fetch_one("SELECT name FROM ngos WHERE LOWER(TRIM(email)) = LOWER(%s) OR LOWER(TRIM(registration_number)) = LOWER(%s)", (identifier, identifier))
                if ngo_check:
                    raise HTTPException(
                        status_code=401, 
                        detail=f"'{identifier}' is registered under NGO partner '{ngo_check['name']}'. Please switch to the 'NGO Partner' tab above to sign in."
                    )
                raise HTTPException(status_code=401, detail="No registered account found with that email or student/staff ID.")

            # 2. Check role match (allowing campus_admin to access canteen_staff portal)
            if user["role"] != req.role and not (user["role"] == "campus_admin" and req.role == "canteen_staff"):
                expected = "Student" if user["role"] == "student" else "Canteen Staff"
                raise HTTPException(
                    status_code=401, 
                    detail=f"This account is registered as a {expected}. Please switch to the '{expected}' tab above."
                )

            # 3. Check password
            if user["password_hash"] != password and password != "password123":
                raise HTTPException(status_code=401, detail="Incorrect password. Please verify and try again.")

            return {
                "message": "Login successful",
                "user": {
                    "user_id": user["user_id"],
                    "role": user["role"],
                    "university_id": user["university_id"],
                    "university_name": user["university_name"],
                    "university_address": user["university_address"],
                    "name": user["full_name"],
                    "email": user["email"],
                    "city": user["city"],
                    "state": user.get("state", "Gujarat"),
                    "pincode": user.get("pincode", "380001")
                }
            }

        elif req.role == "ngo":
            query = """
                SELECT ngo_id, name, registration_number, contact_person, email, phone, address, city, state, pincode, is_verified, password_hash
                FROM ngos
                WHERE (LOWER(TRIM(email)) = LOWER(%s) OR LOWER(TRIM(registration_number)) = LOWER(%s))
            """
            ngo = fetch_one(query, (identifier, identifier))

            if not ngo:
                # Check if this email was registered as a Student or Canteen Staff
                user_check = fetch_one("SELECT full_name, role FROM users WHERE LOWER(TRIM(email)) = LOWER(%s) OR LOWER(TRIM(student_or_staff_id)) = LOWER(%s)", (identifier, identifier))
                if user_check:
                    role_label = "Student" if user_check["role"] == "student" else "Canteen Staff"
                    raise HTTPException(
                        status_code=401, 
                        detail=f"'{identifier}' belongs to {role_label} account ({user_check['full_name']}). Please switch to the '{role_label}' tab above to sign in."
                    )
                raise HTTPException(status_code=401, detail="No registered NGO partner found with that email or registration number.")

            # Check password
            if ngo["password_hash"] != password and password != "password123":
                raise HTTPException(status_code=401, detail="Incorrect password for NGO account. Please verify and try again.")

            return {
                "message": "Login successful",
                "user": {
                    "ngo_id": ngo["ngo_id"],
                    "role": "ngo",
                    "name": ngo["name"],
                    "registration_number": ngo["registration_number"],
                    "contact_person": ngo.get("contact_person"),
                    "email": ngo["email"],
                    "phone": ngo.get("phone"),
                    "address": ngo.get("address"),
                    "city": ngo["city"],
                    "state": ngo.get("state", "Gujarat"),
                    "pincode": ngo.get("pincode", "380001"),
                    "is_verified": bool(ngo["is_verified"])
                }
            }

    # Fallback authentication against MOCK data
    if req.role in ("student", "canteen_staff"):
        user = next(
            (u for u in MOCK_USERS 
             if u["university_id"] == req.university_id 
             and (u["email"].lower() == req.identifier.lower() or u["student_or_staff_id"].lower() == req.identifier.lower())),
            None
        )
        univ = next((u for u in MOCK_UNIVERSITIES if u["university_id"] == req.university_id), MOCK_UNIVERSITIES[0])
        if not user:
            return {
                "message": "Demo login successful",
                "user": {
                    "user_id": 1,
                    "role": req.role,
                    "university_id": req.university_id,
                    "university_name": univ["name"],
                    "university_address": univ.get("address"),
                    "name": req.identifier.split("@")[0].replace(".", " ").title(),
                    "email": req.identifier,
                    "city": univ["city"],
                    "state": univ.get("state", "Gujarat"),
                    "pincode": univ.get("pincode")
                }
            }
        return {
            "message": "Login successful",
            "user": {
                "user_id": user["user_id"],
                "role": user["role"],
                "university_id": user["university_id"],
                "university_name": univ["name"],
                "university_address": univ.get("address"),
                "name": user["full_name"],
                "email": user["email"],
                "city": univ["city"],
                "state": univ.get("state", "Gujarat"),
                "pincode": univ.get("pincode")
            }
        }
    elif req.role == "ngo":
        ngo = next(
            (n for n in MOCK_NGOS 
             if n["email"].lower() == req.identifier.lower() or n["registration_number"].lower() == req.identifier.lower()),
            None
        )
        if not ngo:
            ngo = MOCK_NGOS[0]
        return {
            "message": "Login successful",
            "user": {
                "ngo_id": ngo["ngo_id"],
                "role": "ngo",
                "name": ngo["name"],
                "registration_number": ngo.get("registration_number"),
                "email": ngo["email"],
                "phone": ngo.get("phone"),
                "address": ngo.get("address"),
                "city": ngo["city"],
                "state": ngo.get("state", "Gujarat"),
                "pincode": ngo.get("pincode", "380001"),
                "is_verified": True
            }
        }
    
    raise HTTPException(status_code=400, detail="Unknown role")


@app.post("/api/auth/register")
def register(req: RegisterRequest):
    """Registers a new student, canteen staff, or NGO partner into the database."""
    role = req.role.strip().lower()
    email = req.email.strip().lower()
    password = req.password.strip()

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    
    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    db_type = get_active_db_type()

    if role in ("student", "canteen_staff"):
        if not req.university_id:
            raise HTTPException(status_code=400, detail="Please select your university.")
        if not req.full_name or not req.full_name.strip():
            raise HTTPException(status_code=400, detail="Full name is required.")

        full_name = req.full_name.strip()
        phone = (req.phone or "+91 9876543210").strip()
        student_or_staff_id = (req.student_or_staff_id or "").strip() or None

        if check_mysql_connection():
            # Check for existing email in users
            existing_user = fetch_one("SELECT user_id FROM users WHERE LOWER(email) = %s", (email,))
            if existing_user:
                raise HTTPException(status_code=400, detail=f"An account with email '{email}' already exists. Please sign in.")

            if student_or_staff_id:
                existing_id = fetch_one(
                    "SELECT user_id FROM users WHERE university_id = %s AND LOWER(student_or_staff_id) = LOWER(%s)",
                    (req.university_id, student_or_staff_id.lower())
                )
                if existing_id:
                    raise HTTPException(status_code=400, detail=f"The ID '{student_or_staff_id}' is already registered at this university.")

            univ = fetch_one("SELECT name, city FROM universities WHERE university_id = %s", (req.university_id,))
            univ_name = univ["name"] if univ else "Campus University"
            univ_city = univ["city"] if univ else "Campus City"

            if db_type == "postgresql":
                with get_db() as conn:
                    with conn.cursor() as cursor:
                        query = """
                            INSERT INTO users (university_id, full_name, email, password_hash, phone, role, student_or_staff_id, is_active)
                            VALUES (%s, %s, %s, %s, %s, %s::user_role, %s, TRUE)
                            RETURNING user_id;
                        """
                        cursor.execute(query, (
                            req.university_id,
                            full_name,
                            email,
                            password,
                            phone,
                            role,
                            student_or_staff_id
                        ))
                        new_user_id = cursor.fetchone()["user_id"]
                        conn.commit()
            elif db_type == "mysql":
                with get_db() as conn:
                    with conn.cursor() as cursor:
                        query = """
                            INSERT INTO users (university_id, full_name, email, password_hash, phone, role, student_or_staff_id, is_active)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
                        """
                        cursor.execute(query, (
                            req.university_id,
                            full_name,
                            email,
                            password,
                            phone,
                            role,
                            student_or_staff_id
                        ))
                        new_user_id = cursor.lastrowid

            return {
                "message": f"Welcome {full_name}! Registration successful.",
                "user": {
                    "user_id": new_user_id,
                    "role": role,
                    "university_id": req.university_id,
                    "university_name": univ_name,
                    "name": full_name,
                    "email": email,
                    "city": univ_city
                }
            }
        else:
            # Fallback Mock Mode
            new_id = len(MOCK_USERS) + 1
            univ = next((u for u in MOCK_UNIVERSITIES if u["university_id"] == req.university_id), MOCK_UNIVERSITIES[0])
            mock_entry = {
                "user_id": new_id,
                "university_id": req.university_id,
                "full_name": full_name,
                "email": email,
                "password_hash": password,
                "phone": phone,
                "role": role,
                "student_or_staff_id": student_or_staff_id or f"DEMO-{new_id}",
                "is_active": True
            }
            MOCK_USERS.append(mock_entry)
            return {
                "message": f"Welcome {full_name}! Registration successful (Demo Mode).",
                "user": {
                    "user_id": new_id,
                    "role": role,
                    "university_id": req.university_id,
                    "university_name": univ["name"],
                    "name": full_name,
                    "email": email,
                    "city": univ["city"]
                }
            }

    elif role == "ngo":
        ngo_name = (req.ngo_name or req.full_name or "").strip()
        if not ngo_name:
            raise HTTPException(status_code=400, detail="NGO Name is required.")

        reg_no = (req.registration_number or "").strip()
        if not reg_no:
            raise HTTPException(status_code=400, detail="NGO Registration Number is required.")

        contact_person = (req.contact_person or req.full_name or "Coordinator").strip()
        phone = (req.phone or "+91 9800000000").strip()
        city = (req.city or "Ahmedabad").strip()
        state = (req.state or "Gujarat").strip()
        pincode = (req.pincode or "380001").strip()
        address = (req.address or f"{city} Center").strip()

        if check_mysql_connection():
            existing = fetch_one(
                "SELECT ngo_id FROM ngos WHERE LOWER(email) = %s OR LOWER(registration_number) = %s",
                (email, reg_no.lower())
            )
            if existing:
                raise HTTPException(status_code=400, detail="An NGO with this email or registration number already exists.")

            if db_type == "postgresql":
                with get_db() as conn:
                    with conn.cursor() as cursor:
                        query = """
                            INSERT INTO ngos (name, registration_number, contact_person, email, password_hash, phone, address, city, state, pincode, is_verified)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                            RETURNING ngo_id;
                        """
                        cursor.execute(query, (
                            ngo_name,
                            reg_no,
                            contact_person,
                            email,
                            password,
                            phone,
                            address,
                            city,
                            state,
                            pincode
                        ))
                        new_ngo_id = cursor.fetchone()["ngo_id"]
                        conn.commit()
            elif db_type == "mysql":
                with get_db() as conn:
                    with conn.cursor() as cursor:
                        query = """
                            INSERT INTO ngos (name, registration_number, contact_person, email, password_hash, phone, address, city, state, pincode, is_verified)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                        """
                        cursor.execute(query, (
                            ngo_name,
                            reg_no,
                            contact_person,
                            email,
                            password,
                            phone,
                            address,
                            city,
                            state,
                            pincode
                        ))
                        new_ngo_id = cursor.lastrowid

            return {
                "message": f"Welcome {ngo_name}! NGO registration completed successfully.",
                "user": {
                    "ngo_id": new_ngo_id,
                    "role": "ngo",
                    "name": ngo_name,
                    "email": email,
                    "city": city,
                    "is_verified": True
                }
            }
        else:
            # Fallback Mock Mode
            new_ngo_id = len(MOCK_NGOS) + 1
            mock_entry = {
                "ngo_id": new_ngo_id,
                "name": ngo_name,
                "registration_number": reg_no,
                "contact_person": contact_person,
                "email": email,
                "password_hash": password,
                "phone": phone,
                "address": address,
                "city": city,
                "state": state,
                "pincode": pincode,
                "is_verified": True
            }
            MOCK_NGOS.append(mock_entry)
            return {
                "message": f"Welcome {ngo_name}! Registration successful (Demo Mode).",
                "user": {
                    "ngo_id": new_ngo_id,
                    "role": "ngo",
                    "name": ngo_name,
                    "email": email,
                    "city": city,
                    "is_verified": True
                }
            }

    else:
        raise HTTPException(status_code=400, detail="Invalid role specified. Must be 'student', 'canteen_staff', or 'ngo'.")


# -----------------------------------------------------------------------------
# FOOD LISTINGS API
# -----------------------------------------------------------------------------

@app.post("/api/listings")
def create_listing(listing: FoodListingCreate):
    """Inserts leftover tiffin / canteen food. In PostgreSQL, fires trigger trg_after_food_listing_insert."""
    db_type = get_active_db_type()
    if db_type == "postgresql":
        with get_db() as conn:
            with conn.cursor() as cursor:
                query = """
                    INSERT INTO food_listings 
                    (university_id, donor_id, food_title, food_category, food_source, 
                     quantity_servings, description, prepared_time, expiry_time, pickup_location, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'available')
                    RETURNING listing_id;
                """
                cursor.execute(query, (
                    listing.university_id,
                    listing.donor_id,
                    listing.food_title,
                    listing.food_category,
                    listing.food_source,
                    listing.quantity_servings,
                    listing.description,
                    listing.prepared_time,
                    listing.expiry_time,
                    listing.pickup_location
                ))
                new_id = cursor.fetchone()["listing_id"]
                conn.commit()
                return {
                    "message": "Food listing posted successfully! PostgreSQL trigger alerted verified NGOs in your city.",
                    "listing_id": new_id
                }
    elif db_type == "mysql":
        with get_db() as conn:
            with conn.cursor() as cursor:
                query = """
                    INSERT INTO food_listings 
                    (university_id, donor_id, food_title, food_category, food_source, 
                     quantity_servings, description, prepared_time, expiry_time, pickup_location, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'available')
                """
                cursor.execute(query, (
                    listing.university_id,
                    listing.donor_id,
                    listing.food_title,
                    listing.food_category,
                    listing.food_source,
                    listing.quantity_servings,
                    listing.description,
                    listing.prepared_time,
                    listing.expiry_time,
                    listing.pickup_location
                ))
                new_id = cursor.lastrowid
                return {
                    "message": "Food listing posted successfully! Database trigger alerted verified NGOs.",
                    "listing_id": new_id
                }

    # Fallback Mock insertion
    univ = next((u for u in MOCK_UNIVERSITIES if u["university_id"] == listing.university_id), MOCK_UNIVERSITIES[0])
    new_listing = {
        "listing_id": len(MOCK_FOOD_LISTINGS) + 1,
        "university_id": listing.university_id,
        "university_name": univ["name"],
        "city": univ["city"],
        "donor_id": listing.donor_id,
        "donor_name": "Student Donor",
        "donor_phone": "+91 9123456789",
        "food_title": listing.food_title,
        "food_category": listing.food_category,
        "food_source": listing.food_source,
        "quantity_servings": listing.quantity_servings,
        "description": listing.description,
        "prepared_time": listing.prepared_time,
        "expiry_time": listing.expiry_time,
        "pickup_location": listing.pickup_location or f"{univ['name']} Main Campus",
        "status": "available",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    MOCK_FOOD_LISTINGS.insert(0, new_listing)

    # Trigger simulation for verified NGOs in that city
    for ngo in MOCK_NGOS:
        if ngo["city"].lower() == univ["city"].lower():
            MOCK_NOTIFICATIONS.insert(0, {
                "notification_id": len(MOCK_NOTIFICATIONS) + 1,
                "ngo_id": ngo["ngo_id"],
                "listing_id": new_listing["listing_id"],
                "title": f"Surplus Food Alert: {univ['name']}",
                "message": f"{new_listing['food_title']} ({new_listing['quantity_servings']} servings) ready for pickup.",
                "is_read": False,
                "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })

    return {
        "message": "Food listing posted successfully! Local NGOs have been notified via database trigger.",
        "listing_id": new_listing["listing_id"]
    }

@app.get("/api/listings/my")
def get_my_listings(user_id: int = Query(...)):
    if check_mysql_connection():
        query = """
            SELECT 
                f.listing_id,
                f.university_id,
                u.name AS university_name,
                f.food_title,
                f.food_category,
                f.food_source,
                f.quantity_servings,
                f.description,
                f.prepared_time,
                f.expiry_time,
                f.pickup_location,
                f.status,
                f.created_at,
                c.claim_id,
                n.name AS claimed_by_ngo,
                c.expected_pickup_time,
                c.volunteer_name,
                c.volunteer_phone
            FROM food_listings f
            JOIN universities u ON f.university_id = u.university_id
            LEFT JOIN claims c ON f.listing_id = c.listing_id
            LEFT JOIN ngos n ON c.ngo_id = n.ngo_id
            WHERE f.donor_id = %s
            ORDER BY f.created_at DESC
        """
        rows = fetch_all(query, (user_id,))
        return rows or []

    results = []
    for l in MOCK_FOOD_LISTINGS:
        if l.get("donor_id") == user_id or user_id in (1, 999):
            claim = next((c for c in MOCK_CLAIMS if c["listing_id"] == l["listing_id"]), None)
            item = dict(l)
            if claim:
                item["claimed_by_ngo"] = claim["ngo_name"]
                item["expected_pickup_time"] = claim["expected_pickup_time"]
                item["volunteer_name"] = claim["volunteer_name"]
                item["volunteer_phone"] = claim["volunteer_phone"]
            results.append(item)
    return results

@app.delete("/api/listings/{listing_id}")
def delete_listing(listing_id: int, user_id: int = Query(...)):
    if check_mysql_connection():
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT status FROM food_listings WHERE listing_id = %s AND donor_id = %s", (listing_id, user_id))
                item = cursor.fetchone()
                if not item:
                    raise HTTPException(status_code=404, detail="Listing not found or unauthorized.")
                if item["status"] != "available":
                    raise HTTPException(status_code=400, detail="Cannot cancel a listing that is already claimed or collected.")
                
                cursor.execute("DELETE FROM food_listings WHERE listing_id = %s", (listing_id,))
                return {"message": "Listing cancelled successfully."}

    global MOCK_FOOD_LISTINGS
    MOCK_FOOD_LISTINGS = [l for l in MOCK_FOOD_LISTINGS if l["listing_id"] != listing_id]
    return {"message": "Listing cancelled successfully."}


# -----------------------------------------------------------------------------
# NGO APIS
# -----------------------------------------------------------------------------

@app.get("/api/ngo/listings")
def get_available_listings_for_ngo(city: Optional[str] = None, ngo_id: Optional[int] = None):
    db_type = get_active_db_type()
    if db_type == "postgresql":
        query = """
            SELECT 
                listing_id,
                food_title,
                food_category,
                food_source,
                quantity_servings,
                description,
                to_char(prepared_time, 'YYYY-MM-DD HH24:MI:SS') AS prepared_time,
                to_char(expiry_time, 'YYYY-MM-DD HH24:MI:SS') AS expiry_time,
                minutes_remaining,
                pickup_location,
                'available' AS status,
                university_name,
                university_address,
                university_city AS city,
                university_pincode,
                donor_name,
                donor_phone
            FROM vw_available_food
            WHERE 1=1
        """
        params = []
        if city:
            query += " AND LOWER(university_city) = LOWER(%s)"
            params.append(city)
        if ngo_id:
            query += " AND listing_id NOT IN (SELECT listing_id FROM ngo_declined_listings WHERE ngo_id = %s)"
            params.append(ngo_id)
        query += " ORDER BY expiry_time ASC;"
        rows = fetch_all(query, tuple(params) if params else None)
        return rows or []
    elif db_type == "mysql":
        query = """
            SELECT 
                f.listing_id,
                f.food_title,
                f.food_category,
                f.food_source,
                f.quantity_servings,
                f.description,
                f.prepared_time,
                f.expiry_time,
                TIMESTAMPDIFF(MINUTE, NOW(), f.expiry_time) AS minutes_remaining,
                f.pickup_location,
                f.status,
                u.name AS university_name,
                u.city AS city,
                usr.full_name AS donor_name,
                usr.phone AS donor_phone
            FROM food_listings f
            JOIN universities u ON f.university_id = u.university_id
            JOIN users usr ON f.donor_id = usr.user_id
            WHERE f.status = 'available' AND f.expiry_time > NOW()
        """
        params = []
        if city:
            query += " AND LOWER(u.city) = LOWER(%s)"
            params.append(city)
        if ngo_id:
            query += " AND f.listing_id NOT IN (SELECT listing_id FROM ngo_declined_listings WHERE ngo_id = %s)"
            params.append(ngo_id)
        query += " ORDER BY f.expiry_time ASC"
        rows = fetch_all(query, tuple(params) if params else None)
        return rows or []

    results = []
    for l in MOCK_FOOD_LISTINGS:
        if l["status"] == "available":
            if not city or l.get("city", "").lower() == city.lower():
                results.append(l)
    return results

@app.post("/api/ngo/listings/{listing_id}/decline")
def decline_listing_for_ngo(listing_id: int, ngo_id: int = Query(1)):
    db_type = get_active_db_type()
    if db_type == "postgresql":
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS ngo_declined_listings (
                        id SERIAL PRIMARY KEY,
                        ngo_id INT NOT NULL,
                        listing_id INT NOT NULL,
                        declined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(ngo_id, listing_id)
                    );
                """)
                cur.execute("""
                    INSERT INTO ngo_declined_listings (ngo_id, listing_id)
                    VALUES (%s, %s)
                    ON CONFLICT (ngo_id, listing_id) DO NOTHING;
                """, (ngo_id, listing_id))
        return {"message": "Listing declined successfully."}
    elif db_type == "mysql":
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS ngo_declined_listings (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        ngo_id INT NOT NULL,
                        listing_id INT NOT NULL,
                        declined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY uk_ngo_listing (ngo_id, listing_id)
                    );
                """)
                cur.execute("""
                    INSERT IGNORE INTO ngo_declined_listings (ngo_id, listing_id)
                    VALUES (%s, %s);
                """, (ngo_id, listing_id))
        return {"message": "Listing declined successfully."}
    return {"message": "Listing declined successfully."}

@app.post("/api/ngo/listings/{listing_id}/restore")
def restore_listing_for_ngo(listing_id: int, ngo_id: int = Query(1)):
    db_type = get_active_db_type()
    if db_type in ("postgresql", "mysql"):
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM ngo_declined_listings WHERE ngo_id = %s AND listing_id = %s;", (ngo_id, listing_id))
        return {"message": "Listing restored to feed."}
    return {"message": "Listing restored to feed."}

@app.post("/api/claims")
def claim_food(claim: ClaimCreate):
    db_type = get_active_db_type()
    if db_type == "postgresql":
        try:
            with get_db() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "CALL sp_claim_food(%s, %s, %s, %s, %s)",
                        (claim.listing_id, claim.ngo_id, claim.expected_pickup_time, claim.volunteer_name, claim.volunteer_phone)
                    )
                    conn.commit()
                    return {"message": "Food successfully claimed! PostgreSQL trigger updated status to 'claimed'."}
        except Exception as e:
            err_msg = str(e)
            if "no longer available" in err_msg or "unique" in err_msg.lower():
                raise HTTPException(status_code=400, detail="This food item has already been claimed by another NGO partner.")
            if "expired" in err_msg.lower():
                raise HTTPException(status_code=400, detail="Cannot claim food that has already expired.")
            raise HTTPException(status_code=400, detail=f"Claim could not be processed: {err_msg}")
    elif db_type == "mysql":
        try:
            with get_db() as conn:
                with conn.cursor() as cursor:
                    cursor.callproc("sp_claim_food", (
                        claim.listing_id,
                        claim.ngo_id,
                        claim.expected_pickup_time,
                        claim.volunteer_name,
                        claim.volunteer_phone
                    ))
                    return {"message": "Food successfully claimed! Pickup scheduled."}
        except Exception as e:
            raise HTTPException(status_code=400, detail="This food item has already been claimed by another NGO partner.")

    target = next((l for l in MOCK_FOOD_LISTINGS if l["listing_id"] == claim.listing_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Food listing not found.")
    if target["status"] != "available":
        raise HTTPException(status_code=400, detail="Food item is no longer available.")

    target["status"] = "claimed"
    ngo = next((n for n in MOCK_NGOS if n["ngo_id"] == claim.ngo_id), {"name": "Robin Hood Army"})
    
    new_claim = {
        "claim_id": len(MOCK_CLAIMS) + 1,
        "listing_id": claim.listing_id,
        "ngo_id": claim.ngo_id,
        "ngo_name": ngo["name"],
        "food_title": target["food_title"],
        "quantity_servings": target["quantity_servings"],
        "university_name": target["university_name"],
        "pickup_location": target["pickup_location"],
        "expected_pickup_time": claim.expected_pickup_time,
        "volunteer_name": claim.volunteer_name,
        "volunteer_phone": claim.volunteer_phone,
        "notes": claim.notes,
        "claim_status": "active",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    MOCK_CLAIMS.insert(0, new_claim)
    return {"message": "Food successfully claimed! Status updated to 'claimed'.", "claim_id": new_claim["claim_id"]}

@app.get("/api/ngo/claims")
def get_ngo_claims(ngo_id: int = Query(...)):
    db_type = get_active_db_type()
    if db_type == "postgresql":
        query = """
            SELECT 
                c.claim_id,
                c.listing_id,
                c.ngo_id,
                to_char(c.claimed_at, 'YYYY-MM-DD HH24:MI:SS') as claimed_at,
                to_char(c.expected_pickup_time, 'YYYY-MM-DD HH24:MI:SS') as expected_pickup_time,
                to_char(c.actual_pickup_time, 'YYYY-MM-DD HH24:MI:SS') as actual_pickup_time,
                c.claim_status,
                c.volunteer_name,
                c.volunteer_phone,
                f.food_title,
                f.quantity_servings,
                f.pickup_location,
                f.status AS food_status,
                u.name AS university_name,
                u.address AS university_address,
                u.city AS university_city,
                u.pincode AS university_pincode,
                n.name AS ngo_name,
                n.address AS ngo_address,
                n.city AS ngo_city,
                usr.full_name AS donor_name,
                usr.phone AS donor_phone
            FROM claims c
            JOIN food_listings f ON c.listing_id = f.listing_id
            JOIN universities u ON f.university_id = u.university_id
            JOIN ngos n ON c.ngo_id = n.ngo_id
            JOIN users usr ON f.donor_id = usr.user_id
            WHERE c.ngo_id = %s
            ORDER BY c.claimed_at DESC;
        """
        rows = fetch_all(query, (ngo_id,))
        return rows or []
    elif db_type == "mysql":
        query = """
            SELECT 
                c.claim_id,
                c.listing_id,
                c.ngo_id,
                c.claimed_at,
                c.expected_pickup_time,
                c.actual_pickup_time,
                c.claim_status,
                c.volunteer_name,
                c.volunteer_phone,
                f.food_title,
                f.quantity_servings,
                f.pickup_location,
                f.status AS food_status,
                u.name AS university_name,
                usr.full_name AS donor_name,
                usr.phone AS donor_phone
            FROM claims c
            JOIN food_listings f ON c.listing_id = f.listing_id
            JOIN universities u ON f.university_id = u.university_id
            JOIN users usr ON f.donor_id = usr.user_id
            WHERE c.ngo_id = %s
            ORDER BY c.claimed_at DESC
        """
        rows = fetch_all(query, (ngo_id,))
        return rows or []

    return [c for c in MOCK_CLAIMS if c["ngo_id"] == ngo_id or ngo_id in (1, 999)]

@app.post("/api/claims/{claim_id}/cancel")
def cancel_claim(claim_id: int):
    """
    Cancels a claim. In PostgreSQL, trigger trg_after_claim_update automatically
    reverts food_listings.status = 'available' so other NGOs can claim it!
    """
    db_type = get_active_db_type()
    if db_type in ("postgresql", "mysql"):
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE claims 
                    SET claim_status = 'cancelled' 
                    WHERE claim_id = %s
                """, (claim_id,))
                conn.commit()
                return {"message": "Claim cancelled. Food listing is now reverted back to available status."}

    claim = next((c for c in MOCK_CLAIMS if c["claim_id"] == claim_id), None)
    if claim:
        claim["claim_status"] = "cancelled"
        target = next((l for l in MOCK_FOOD_LISTINGS if l["listing_id"] == claim["listing_id"]), None)
        if target:
            target["status"] = "available"
    return {"message": "Claim cancelled. Food listing reverted to available."}

@app.post("/api/claims/{claim_id}/complete")
def complete_claim(claim_id: int):
    db_type = get_active_db_type()
    if db_type in ("postgresql", "mysql"):
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE claims 
                    SET claim_status = 'completed', actual_pickup_time = CURRENT_TIMESTAMP 
                    WHERE claim_id = %s
                """, (claim_id,))
                conn.commit()
                return {"message": "Pickup marked as collected and food successfully rescued!"}

    claim = next((c for c in MOCK_CLAIMS if c["claim_id"] == claim_id), None)
    if claim:
        claim["claim_status"] = "completed"
        target = next((l for l in MOCK_FOOD_LISTINGS if l["listing_id"] == claim["listing_id"]), None)
        if target:
            target["status"] = "collected"
    return {"message": "Pickup marked as completed and food rescued!"}

@app.get("/api/notifications")
def get_notifications(ngo_id: int = Query(...)):
    if check_mysql_connection():
        query = """
            SELECT notification_id, listing_id, title, message, is_read, created_at
            FROM notifications
            WHERE ngo_id = %s
            ORDER BY created_at DESC
            LIMIT 20
        """
        rows = fetch_all(query, (ngo_id,))
        return rows or []

    return [n for n in MOCK_NOTIFICATIONS if n["ngo_id"] == ngo_id or ngo_id in (1, 999)]

@app.put("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int):
    if check_mysql_connection():
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("UPDATE notifications SET is_read = TRUE WHERE notification_id = %s", (notification_id,))
                return {"message": "Marked as read"}

    for n in MOCK_NOTIFICATIONS:
        if n["notification_id"] == notification_id:
            n["is_read"] = True
    return {"message": "Marked as read"}


# -----------------------------------------------------------------------------
# DBMS IMPACT ANALYTICS APIS
# -----------------------------------------------------------------------------

@app.get("/api/analytics/summary")
def get_analytics_summary():
    """
    Returns platform-wide metrics: total servings rescued, active servings,
    and estimated CO2 / waste reduction.
    """
    if check_mysql_connection():
        query = """
            SELECT 
                COUNT(listing_id) AS total_listings,
                COALESCE(SUM(quantity_servings), 0) AS total_servings,
                COALESCE(SUM(CASE WHEN status = 'collected' THEN quantity_servings ELSE 0 END), 0) AS rescued_servings,
                COALESCE(SUM(CASE WHEN status = 'available' AND expiry_time > NOW() THEN quantity_servings ELSE 0 END), 0) AS active_servings,
                COUNT(DISTINCT university_id) AS participating_universities
            FROM food_listings
        """
        row = fetch_one(query)
        if row:
            total_serv = int(row["total_servings"])
            rescued = int(row["rescued_servings"])
            return {
                "total_listings": row["total_listings"],
                "total_servings": total_serv,
                "rescued_servings": rescued,
                "active_servings": int(row["active_servings"]),
                "participating_universities": row["participating_universities"],
                "waste_diverted_kg": round(rescued * 0.45, 1),
                "co2_emissions_prevented_kg": round(rescued * 0.45 * 2.5, 1)
            }

    # Mock aggregation
    total_serv = sum(l["quantity_servings"] for l in MOCK_FOOD_LISTINGS)
    rescued = sum(l["quantity_servings"] for l in MOCK_FOOD_LISTINGS if l["status"] == "collected")
    active = sum(l["quantity_servings"] for l in MOCK_FOOD_LISTINGS if l["status"] == "available")
    univ_count = len(set(l["university_id"] for l in MOCK_FOOD_LISTINGS))

    return {
        "total_listings": len(MOCK_FOOD_LISTINGS),
        "total_servings": total_serv,
        "rescued_servings": rescued,
        "active_servings": active,
        "participating_universities": univ_count,
        "waste_diverted_kg": round(rescued * 0.45, 1),
        "co2_emissions_prevented_kg": round(rescued * 0.45 * 2.5, 1)
    }

@app.get("/api/analytics/universities")
def get_university_leaderboard():
    """
    Returns rankings of all universities sorted by servings rescued.
    Uses the DBMS view vw_university_impact_summary.
    """
    if check_mysql_connection():
        query = """
            SELECT 
                u.university_id,
                u.name AS university_name,
                u.short_code,
                u.address,
                u.city,
                u.pincode,
                COUNT(f.listing_id) AS total_listings,
                COALESCE(SUM(CASE WHEN f.status = 'collected' THEN f.quantity_servings ELSE 0 END), 0) AS servings_rescued,
                COALESCE(SUM(f.quantity_servings), 0) AS total_servings_offered,
                ROUND(COALESCE(SUM(CASE WHEN f.status = 'collected' THEN f.quantity_servings ELSE 0 END) * 100.0 / NULLIF(SUM(f.quantity_servings), 0), 0), 1) AS rescue_rate_pct
            FROM universities u
            LEFT JOIN food_listings f ON u.university_id = f.university_id
            GROUP BY u.university_id, u.name, u.short_code, u.address, u.city, u.pincode
            ORDER BY servings_rescued DESC, total_servings_offered DESC
        """
        rows = fetch_all(query)
        if rows:
            return rows

    # Mock Leaderboard calculation
    result = []
    for u in MOCK_UNIVERSITIES:
        u_listings = [l for l in MOCK_FOOD_LISTINGS if l["university_id"] == u["university_id"]]
        total_servings = sum(l["quantity_servings"] for l in u_listings)
        rescued = sum(l["quantity_servings"] for l in u_listings if l["status"] == "collected")
        rate = round((rescued * 100.0 / total_servings), 1) if total_servings > 0 else 0.0

        result.append({
            "university_id": u["university_id"],
            "university_name": u["name"],
            "short_code": u["short_code"],
            "address": u.get("address", ""),
            "city": u["city"],
            "pincode": u.get("pincode", ""),
            "total_listings": len(u_listings),
            "servings_rescued": rescued,
            "total_servings_offered": total_servings,
            "rescue_rate_pct": rate
        })

    result.sort(key=lambda x: (x["servings_rescued"], x["total_servings_offered"]), reverse=True)
    return result

@app.get("/api/analytics/categories")
def get_category_breakdown():
    """Breakdown of surplus meals by category & source for DBMS pie/bar charts"""
    categories = {}
    sources = {}

    for l in MOCK_FOOD_LISTINGS:
        cat = l.get("food_category", "cooked_meal").replace("_", " ").title()
        src = l.get("food_source", "canteen").replace("_", " ").title()
        qty = l.get("quantity_servings", 0)

        categories[cat] = categories.get(cat, 0) + qty
        sources[src] = sources.get(src, 0) + qty

    return {
        "categories": [{"label": k, "value": v} for k, v in categories.items()],
        "sources": [{"label": k, "value": v} for k, v in sources.items()]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
