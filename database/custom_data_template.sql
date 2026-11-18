-- ============================================================================
-- FoodBridge: Custom Data Template for Your College / University
-- Open this file in pgAdmin 4 (Query Tool) connected to campus_food_db
-- ============================================================================

-- Step 1: Clear existing demo data (safely cascades through foreign keys)
TRUNCATE claims, notifications, food_listings, users, ngos, universities RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------------------
-- Step 2: Insert YOUR Universities / Colleges
-- ----------------------------------------------------------------------------
INSERT INTO universities (university_id, name, short_code, address, city, state, pincode, contact_email, contact_phone) VALUES
(1, 'Your College / Institute Name', 'YCI', 'College Campus Road', 'Your City', 'Your State', '560001', 'admin@yourcollege.edu', '+91 9876543210'),
(2, 'Partner College / Campus 2', 'PC-2', 'Outer Ring Road', 'Your City', 'Your State', '560002', 'contact@partnercollege.edu', '+91 9876543211');

-- Reset sequence counter so new registrations get valid IDs
SELECT setval('universities_university_id_seq', (SELECT MAX(university_id) FROM universities));

-- ----------------------------------------------------------------------------
-- Step 3: Insert YOUR Students, Canteen Staff, and Admins
-- (Password default is 'password123' or any password you prefer)
-- ----------------------------------------------------------------------------
INSERT INTO users (user_id, university_id, full_name, email, password_hash, phone, role, student_or_staff_id) VALUES
-- Your Student Account
(1, 1, 'Your Full Name', 'your.email@yourcollege.edu', 'password123', '+91 9876543210', 'student', 'ROLL2024CS01'),
-- Team Member / Friend Student Account
(2, 1, 'Teammate Name', 'teammate@yourcollege.edu', 'password123', '+91 9876543211', 'student', 'ROLL2024CS02'),
-- Campus Canteen / Mess Incharge Account
(3, 1, 'Campus Mess Contractor', 'canteen@yourcollege.edu', 'password123', '+91 9876543212', 'canteen_staff', 'STAFF-MESS-01'),
-- Campus Admin / Warden Account
(4, 1, 'Hostel Warden', 'warden@yourcollege.edu', 'password123', '+91 9876543213', 'campus_admin', 'STAFF-ADMIN-01');

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- ----------------------------------------------------------------------------
-- Step 4: Insert YOUR Local NGO Partners
-- ----------------------------------------------------------------------------
INSERT INTO ngos (ngo_id, name, registration_number, contact_person, email, password_hash, phone, address, city, state, pincode, operating_radius_km, is_verified) VALUES
(1, 'Local Food Rescue Foundation', 'NGO-REG-2024-001', 'NGO Coordinator Name', 'ngo@foodrescue.org', 'password123', '+91 9888812345', 'Main Office, City Center', 'Your City', 'Your State', '560001', 25.00, TRUE),
(2, 'Robin Hood Army - Local Chapter', 'RHA-LOCAL-2024-002', 'City Chapter Lead', 'local@robinhoodarmy.com', 'password123', '+91 9888854321', 'Community Hall, Sector 4', 'Your City', 'Your State', '560001', 30.00, TRUE);

SELECT setval('ngos_ngo_id_seq', (SELECT MAX(ngo_id) FROM ngos));

-- ----------------------------------------------------------------------------
-- Step 5: (Optional) Insert Starting Surplus Food Listings
-- Or you can leave this empty and post directly from the web dashboards!
-- ----------------------------------------------------------------------------
INSERT INTO food_listings (listing_id, university_id, donor_id, food_title, food_category, food_source, quantity_servings, description, is_perishable, prepared_time, expiry_time, pickup_location, status) VALUES
(1, 1, 3, 'Fresh Veg Biryani & Raita (Canteen Lunch)', 'cooked_meal', 'canteen', 35, 'Hygienically stored in food warmers after campus lunch session.', TRUE, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '5 hour', 'Central Canteen Main Gate', 'available'),
(2, 1, 1, 'Homemade Paneer Butter Masala & Rotis', 'cooked_meal', 'student_tiffin', 4, 'Extra packed lunch tiffins from project group discussion.', TRUE, CURRENT_TIMESTAMP - INTERVAL '30 minutes', CURRENT_TIMESTAMP + INTERVAL '5 hours 30 minutes', 'Hostel Block A Desk', 'available');

SELECT setval('food_listings_listing_id_seq', (SELECT MAX(listing_id) FROM food_listings));
