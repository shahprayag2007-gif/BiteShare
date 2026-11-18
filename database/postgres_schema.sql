-- ============================================================================
-- Project: Campus Food Surplus Bridge & NGO Redistribution System
-- Subject: Database Management Systems (DBMS)
-- Dialect: PostgreSQL 14+ / 16+ / 18+ (pgAdmin compatible)
-- ============================================================================

-- If database does not exist, run in pgAdmin Query Tool:
-- CREATE DATABASE campus_food_db;
-- Connect to campus_food_db before running the script below.

-- ----------------------------------------------------------------------------
-- Drop existing objects if they exist
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_food_listing_insert ON food_listings CASCADE;
DROP TRIGGER IF EXISTS trg_before_claim_insert ON claims CASCADE;
DROP TRIGGER IF EXISTS trg_after_claim_insert ON claims CASCADE;
DROP TRIGGER IF EXISTS trg_after_claim_update ON claims CASCADE;

DROP FUNCTION IF EXISTS fn_after_food_listing_insert CASCADE;
DROP FUNCTION IF EXISTS fn_before_claim_insert CASCADE;
DROP FUNCTION IF EXISTS fn_after_claim_insert CASCADE;
DROP FUNCTION IF EXISTS fn_after_claim_update CASCADE;
DROP PROCEDURE IF EXISTS sp_claim_food CASCADE;

DROP VIEW IF EXISTS vw_available_food CASCADE;
DROP VIEW IF EXISTS vw_university_impact_summary CASCADE;

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS food_listings CASCADE;
DROP TABLE IF EXISTS ngos CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS universities CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS food_category_type CASCADE;
DROP TYPE IF EXISTS food_source_type CASCADE;
DROP TYPE IF EXISTS food_status_type CASCADE;
DROP TYPE IF EXISTS claim_status_type CASCADE;
DROP TYPE IF EXISTS recipient_type CASCADE;

-- ----------------------------------------------------------------------------
-- Custom ENUM Types for PostgreSQL
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('student', 'canteen_staff', 'campus_admin');
CREATE TYPE food_category_type AS ENUM ('cooked_meal', 'packed_food', 'bakery_snacks', 'fruits_vegetables', 'beverages');
CREATE TYPE food_source_type AS ENUM ('student_tiffin', 'hostel_mess', 'canteen', 'campus_event');
CREATE TYPE food_status_type AS ENUM ('available', 'claimed', 'collected', 'cancelled', 'expired');
CREATE TYPE claim_status_type AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE recipient_type AS ENUM ('ngo', 'user');

-- ----------------------------------------------------------------------------
-- Table 1: UNIVERSITIES
-- ----------------------------------------------------------------------------
CREATE TABLE universities (
    university_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    short_code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    contact_email VARCHAR(120) NOT NULL UNIQUE,
    contact_phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Table 2: USERS
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    university_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    student_or_staff_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_university FOREIGN KEY (university_id) 
        REFERENCES universities(university_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ----------------------------------------------------------------------------
-- Table 3: NGOS
-- ----------------------------------------------------------------------------
CREATE TABLE ngos (
    ngo_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    registration_number VARCHAR(80) NOT NULL UNIQUE,
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    operating_radius_km NUMERIC(5, 2) DEFAULT 25.00,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Table 4: FOOD_LISTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE food_listings (
    listing_id SERIAL PRIMARY KEY,
    university_id INT NOT NULL,
    donor_id INT NOT NULL,
    food_title VARCHAR(150) NOT NULL,
    food_category food_category_type NOT NULL,
    food_source food_source_type NOT NULL,
    quantity_servings INT NOT NULL CHECK (quantity_servings > 0),
    description TEXT,
    is_perishable BOOLEAN DEFAULT TRUE,
    prepared_time TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup_location VARCHAR(255) NOT NULL DEFAULT 'Campus Main Gate / Canteen',
    status food_status_type NOT NULL DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_food_university FOREIGN KEY (university_id) 
        REFERENCES universities(university_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_food_donor FOREIGN KEY (donor_id) 
        REFERENCES users(user_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_expiry_after_prepared CHECK (expiry_time > prepared_time)
);

-- ----------------------------------------------------------------------------
-- Table 5: CLAIMS
-- ----------------------------------------------------------------------------
CREATE TABLE claims (
    claim_id SERIAL PRIMARY KEY,
    listing_id INT NOT NULL UNIQUE,
    ngo_id INT NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expected_pickup_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_pickup_time TIMESTAMP WITH TIME ZONE NULL,
    claim_status claim_status_type NOT NULL DEFAULT 'active',
    volunteer_name VARCHAR(100),
    volunteer_phone VARCHAR(20),
    notes TEXT,
    CONSTRAINT fk_claim_listing FOREIGN KEY (listing_id) 
        REFERENCES food_listings(listing_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_claim_ngo FOREIGN KEY (ngo_id) 
        REFERENCES ngos(ngo_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ----------------------------------------------------------------------------
-- Table 6: NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    recipient_type recipient_type NOT NULL,
    ngo_id INT NULL,
    user_id INT NULL,
    listing_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notify_ngo FOREIGN KEY (ngo_id) 
        REFERENCES ngos(ngo_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notify_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notify_listing FOREIGN KEY (listing_id) 
        REFERENCES food_listings(listing_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ----------------------------------------------------------------------------
-- Table 7: NGO_DECLINED_LISTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ngo_declined_listings (
    id SERIAL PRIMARY KEY,
    ngo_id INT NOT NULL,
    listing_id INT NOT NULL,
    declined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ngo_declined_listing UNIQUE(ngo_id, listing_id),
    CONSTRAINT fk_declined_ngo FOREIGN KEY (ngo_id)
        REFERENCES ngos(ngo_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_declined_listing FOREIGN KEY (listing_id)
        REFERENCES food_listings(listing_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ----------------------------------------------------------------------------
-- PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX idx_food_status_univ ON food_listings(status, university_id);
CREATE INDEX idx_food_expiry ON food_listings(expiry_time);
CREATE INDEX idx_ngo_city ON ngos(city, is_verified);
CREATE INDEX idx_notification_ngo ON notifications(ngo_id, is_read);

-- ----------------------------------------------------------------------------
-- POSTGRESQL TRIGGERS & FUNCTIONS
-- ----------------------------------------------------------------------------

-- Trigger Function 1: Automatically notify verified NGOs in the same city
CREATE OR REPLACE FUNCTION fn_after_food_listing_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_univ_name VARCHAR(150);
    v_univ_city VARCHAR(100);
BEGIN
    SELECT name, city INTO v_univ_name, v_univ_city
    FROM universities
    WHERE university_id = NEW.university_id;

    INSERT INTO notifications (recipient_type, ngo_id, listing_id, title, message)
    SELECT 
        'ngo',
        n.ngo_id,
        NEW.listing_id,
        'Surplus Food Alert: ' || v_univ_name,
        NEW.food_title || ' (' || NEW.quantity_servings || ' servings) ready for pickup at ' || v_univ_name || '. Expiry: ' || to_char(NEW.expiry_time, 'DD Mon HH24:MI')
    FROM ngos n
    WHERE n.city = v_univ_city AND n.is_verified = TRUE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_food_listing_insert
AFTER INSERT ON food_listings
FOR EACH ROW
EXECUTE FUNCTION fn_after_food_listing_insert();

-- Trigger Function 2: Prevent claiming expired food or unavailable food
CREATE OR REPLACE FUNCTION fn_before_claim_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_status food_status_type;
    v_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT status, expiry_time INTO v_status, v_expiry
    FROM food_listings
    WHERE listing_id = NEW.listing_id;

    IF v_status != 'available' THEN
        RAISE EXCEPTION 'This food item is no longer available for claim.';
    END IF;

    IF v_expiry <= CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Cannot claim food that has already expired.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_before_claim_insert
BEFORE INSERT ON claims
FOR EACH ROW
EXECUTE FUNCTION fn_before_claim_insert();

-- Trigger Function 3: Update listing status to 'claimed' and alert donor
CREATE OR REPLACE FUNCTION fn_after_claim_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_ngo_name VARCHAR(150);
    v_donor_id INT;
    v_title VARCHAR(150);
BEGIN
    UPDATE food_listings
    SET status = 'claimed'
    WHERE listing_id = NEW.listing_id;

    SELECT donor_id, food_title INTO v_donor_id, v_title
    FROM food_listings
    WHERE listing_id = NEW.listing_id;

    SELECT name INTO v_ngo_name
    FROM ngos
    WHERE ngo_id = NEW.ngo_id;

    INSERT INTO notifications (recipient_type, user_id, listing_id, title, message)
    VALUES (
        'user',
        v_donor_id,
        NEW.listing_id,
        'Food Claimed by NGO!',
        'Great news! ' || v_ngo_name || ' claimed "' || v_title || '". Volunteer: ' || COALESCE(NEW.volunteer_name, 'Assigned')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_claim_insert
AFTER INSERT ON claims
FOR EACH ROW
EXECUTE FUNCTION fn_after_claim_insert();

-- Trigger Function 4: Update listing status on completion or cancellation
CREATE OR REPLACE FUNCTION fn_after_claim_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.claim_status = 'completed' AND OLD.claim_status != 'completed' THEN
        UPDATE food_listings
        SET status = 'collected'
        WHERE listing_id = NEW.listing_id;
    ELSIF NEW.claim_status = 'cancelled' AND OLD.claim_status != 'cancelled' THEN
        UPDATE food_listings
        SET status = 'available'
        WHERE listing_id = NEW.listing_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_claim_update
AFTER UPDATE ON claims
FOR EACH ROW
EXECUTE FUNCTION fn_after_claim_update();

-- ----------------------------------------------------------------------------
-- POSTGRESQL STORED PROCEDURE (Concurrency Row Locking)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_claim_food(
    p_listing_id INT,
    p_ngo_id INT,
    p_expected_pickup TIMESTAMP WITH TIME ZONE,
    p_volunteer_name VARCHAR,
    p_volunteer_phone VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Row-level lock to prevent double-claiming by simultaneous NGOs
    PERFORM listing_id, status 
    FROM food_listings 
    WHERE listing_id = p_listing_id 
    FOR UPDATE;

    INSERT INTO claims (listing_id, ngo_id, expected_pickup_time, volunteer_name, volunteer_phone)
    VALUES (p_listing_id, p_ngo_id, p_expected_pickup, p_volunteer_name, p_volunteer_phone);
END;
$$;

-- ----------------------------------------------------------------------------
-- VIEWS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_available_food AS
SELECT 
    f.listing_id,
    f.food_title,
    f.food_category,
    f.food_source,
    f.quantity_servings,
    f.description,
    f.prepared_time,
    f.expiry_time,
    ROUND(EXTRACT(EPOCH FROM (f.expiry_time - CURRENT_TIMESTAMP)) / 60) AS minutes_remaining,
    f.pickup_location,
    u.name AS university_name,
    u.city AS university_city,
    usr.full_name AS donor_name,
    usr.phone AS donor_phone
FROM food_listings f
JOIN universities u ON f.university_id = u.university_id
JOIN users usr ON f.donor_id = usr.user_id
WHERE f.status = 'available' 
  AND f.expiry_time > CURRENT_TIMESTAMP
ORDER BY f.expiry_time ASC;

CREATE OR REPLACE VIEW vw_university_impact_summary AS
SELECT 
    u.university_id,
    u.name AS university_name,
    u.city,
    COUNT(f.listing_id) AS total_listings_posted,
    COALESCE(SUM(CASE WHEN f.status = 'collected' THEN f.quantity_servings ELSE 0 END), 0) AS total_servings_rescued,
    COALESCE(SUM(CASE WHEN f.status = 'available' AND f.expiry_time > CURRENT_TIMESTAMP THEN f.quantity_servings ELSE 0 END), 0) AS current_active_servings,
    COALESCE(SUM(f.quantity_servings), 0) AS total_servings_offered
FROM universities u
LEFT JOIN food_listings f ON u.university_id = f.university_id
GROUP BY u.university_id, u.name, u.city;
