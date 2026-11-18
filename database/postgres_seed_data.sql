-- ============================================================================
-- Project: Campus Food Surplus Bridge & NGO Redistribution System
-- PostgreSQL Seed Data (Single City Operating Model: Bengaluru)
-- ============================================================================

-- 1. Insert Universities (All in Single Operating City: Bengaluru)
INSERT INTO universities (university_id, name, short_code, address, city, state, pincode, contact_email, contact_phone) VALUES
(1, 'National Institute of Technology', 'NIT-B', 'Campus Road, Tech Zone', 'Bengaluru', 'Karnataka', '560001', 'admin@nit.edu', '+91 9876543210'),
(2, 'Bengaluru City University', 'BCU', 'Central College Campus, Dr. Ambedkar Veedhi', 'Bengaluru', 'Karnataka', '560001', 'registrar@bcu.ac.in', '+91 9876543211'),
(3, 'RV College of Engineering', 'RVCE', 'Mysuru Road, RV Vidyaniketan', 'Bengaluru', 'Karnataka', '560059', 'info@rvce.edu.in', '+91 9876543212'),
(4, 'PES University', 'PESU', '100 Feet Ring Road, BSK III Stage', 'Bengaluru', 'Karnataka', '560085', 'office@pes.edu', '+91 9876543213')
ON CONFLICT (university_id) DO NOTHING;

SELECT setval('universities_university_id_seq', (SELECT MAX(university_id) FROM universities));

-- 2. Insert Users
INSERT INTO users (user_id, university_id, full_name, email, password_hash, phone, role, student_or_staff_id) VALUES
(1, 1, 'Aarav Sharma', 'aarav.sharma@nit.edu', 'password123', '+91 9123456781', 'student', 'NIT2024CS042'),
(2, 1, 'Ramesh Babu (Canteen Incharge)', 'ramesh.canteen@nit.edu', 'password123', '+91 9123456782', 'canteen_staff', 'STAFF-NIT-019'),
(3, 1, 'Dr. Sunita Rao (Hostel Warden)', 'sunita.rao@nit.edu', 'password123', '+91 9123456783', 'campus_admin', 'STAFF-NIT-004'),
(4, 2, 'Priya Verma', 'priya.v@bcu.ac.in', 'password123', '+91 9123456784', 'student', 'BCU2023IT108'),
(5, 2, 'Sanjay Kumar (Mess Contractor)', 'sanjay.mess@bcu.ac.in', 'password123', '+91 9123456785', 'canteen_staff', 'STAFF-BCU-031'),
(6, 3, 'Rohan Joshi', 'rohan.j@rvce.edu.in', 'password123', '+91 9123456786', 'student', 'RV2022ME055'),
(7, 3, 'Anand Patil (Central Canteen)', 'anand.canteen@rvce.edu.in', 'password123', '+91 9123456787', 'canteen_staff', 'STAFF-RV-012')
ON CONFLICT (user_id) DO NOTHING;

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- 3. Insert NGOs (All in Single Operating City: Bengaluru)
INSERT INTO ngos (ngo_id, name, registration_number, contact_person, email, password_hash, phone, address, city, state, pincode, operating_radius_km, is_verified) VALUES
(1, 'Robin Hood Army Bengaluru', 'RHA-BLR-2018-9901', 'Vikram Sen', 'bengaluru@robinhoodarmy.com', 'password123', '+91 9888812345', 'Indiranagar 100ft Road', 'Bengaluru', 'Karnataka', '560038', 30.00, TRUE),
(2, 'Feed The Need Bengaluru', 'FTN-KA-2020-4122', 'Meera Nair', 'contact@feedtheneedblr.org', 'password123', '+91 9888812346', 'Koramangala 4th Block', 'Bengaluru', 'Karnataka', '560034', 20.00, TRUE),
(3, 'Hasiru Dala Food Relief', 'HDF-KA-2019-3382', 'Kavita Kulkarni', 'relief@hasirudala.org', 'password123', '+91 9888812348', 'Malleshwaram', 'Bengaluru', 'Karnataka', '560003', 25.00, TRUE),
(4, 'Bengaluru Annapurna Seva', 'BAS-KA-2021-8890', 'Farhan Merchant', 'contact@bengaluruannapurna.org', 'password123', '+91 9888812349', 'Jayanagar 4th Block', 'Bengaluru', 'Karnataka', '560041', 30.00, TRUE)
ON CONFLICT (ngo_id) DO NOTHING;

SELECT setval('ngos_ngo_id_seq', (SELECT MAX(ngo_id) FROM ngos));

-- 4. Insert Food Listings (All across Bengaluru Campuses)
INSERT INTO food_listings (listing_id, university_id, donor_id, food_title, food_category, food_source, quantity_servings, description, is_perishable, prepared_time, expiry_time, pickup_location, status) VALUES
(1, 1, 2, 'Cooked Rice & Dal Makhani (Dinner Leftover)', 'cooked_meal', 'canteen', 45, 'Freshly prepared evening batch, hygienically packed in large containers.', TRUE, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '4 hour', 'NIT Central Canteen Main Gate, Block B', 'available'),
(2, 1, 1, 'Homemade Veg Pulao & Roti (Unopened Tiffins)', 'cooked_meal', 'student_tiffin', 6, 'Cooked in afternoon, excess packed home tiffins from project team.', TRUE, CURRENT_TIMESTAMP - INTERVAL '2 hour', CURRENT_TIMESTAMP + INTERVAL '3 hour', 'NIT Boys Hostel 3, Reception Desk', 'available'),
(3, 2, 5, 'Mixed Veg Curry, Parathas & Gulab Jamun', 'cooked_meal', 'canteen', 80, 'Surplus from annual tech symposium faculty buffet lunch.', TRUE, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '5 hour', 'BCU Central Campus Convention Centre Pantry #2', 'available'),
(4, 3, 7, 'Fresh Sandwiches & Fruit Juice Cartons', 'packed_food', 'canteen', 30, 'Leftover packaged snacks from orientation program.', FALSE, CURRENT_TIMESTAMP - INTERVAL '3 hour', CURRENT_TIMESTAMP + INTERVAL '12 hour', 'RVCE Auditorium Green Room', 'available')
ON CONFLICT (listing_id) DO NOTHING;

SELECT setval('food_listings_listing_id_seq', (SELECT MAX(listing_id) FROM food_listings));
