-- ============================================================================
-- Project: Campus Food Waste Management & NGO Redistribution System
-- Subject: Database Management Systems (DBMS)
-- Database Dialect: MySQL 8.0+ / MariaDB
-- ============================================================================

DROP DATABASE IF EXISTS campus_food_db;
CREATE DATABASE campus_food_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campus_food_db;

-- ----------------------------------------------------------------------------
-- Table 1: UNIVERSITIES
-- Stores university/college campus records
-- ----------------------------------------------------------------------------
CREATE TABLE universities (
    university_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    short_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'MIT', 'DU', 'VTU'
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    contact_email VARCHAR(120) NOT NULL UNIQUE,
    contact_phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Table 2: USERS (Students, Canteen Staff, Campus Admins)
-- Stores donors and campus coordinators
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role ENUM('student', 'canteen_staff', 'campus_admin') NOT NULL DEFAULT 'student',
    student_or_staff_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_university FOREIGN KEY (university_id) 
        REFERENCES universities(university_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Table 3: NGOS (Non-Governmental Organizations)
-- Registered NGOs eligible to collect surplus food
-- ----------------------------------------------------------------------------
CREATE TABLE ngos (
    ngo_id INT AUTO_INCREMENT PRIMARY KEY,
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
    operating_radius_km DECIMAL(5, 2) DEFAULT 25.00,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Table 4: FOOD_LISTINGS
-- Leftover food posted by students or campus canteens
-- ----------------------------------------------------------------------------
CREATE TABLE food_listings (
    listing_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    donor_id INT NOT NULL,
    food_title VARCHAR(150) NOT NULL,
    food_category ENUM('cooked_meal', 'packed_food', 'bakery_snacks', 'fruits_vegetables', 'beverages') NOT NULL,
    food_source ENUM('student_tiffin', 'hostel_mess', 'canteen', 'campus_event') NOT NULL,
    quantity_servings INT NOT NULL,
    description TEXT,
    is_perishable BOOLEAN DEFAULT TRUE,
    prepared_time DATETIME NOT NULL,
    expiry_time DATETIME NOT NULL,
    pickup_location VARCHAR(255) NOT NULL, -- e.g., 'Mess Block A, Counter 2'
    status ENUM('available', 'claimed', 'collected', 'cancelled', 'expired') NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_food_university FOREIGN KEY (university_id) 
        REFERENCES universities(university_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_food_donor FOREIGN KEY (donor_id) 
        REFERENCES users(user_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_quantity_positive CHECK (quantity_servings > 0),
    CONSTRAINT chk_expiry_after_prepared CHECK (expiry_time > prepared_time)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Table 5: CLAIMS (Pickups by NGOs)
-- Tracks which NGO claimed which food listing
-- ----------------------------------------------------------------------------
CREATE TABLE claims (
    claim_id INT AUTO_INCREMENT PRIMARY KEY,
    listing_id INT NOT NULL UNIQUE, -- 1-to-1 relationship with active claim
    ngo_id INT NOT NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_pickup_time DATETIME NOT NULL,
    actual_pickup_time DATETIME NULL,
    claim_status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    volunteer_name VARCHAR(100),
    volunteer_phone VARCHAR(20),
    notes TEXT,
    CONSTRAINT fk_claim_listing FOREIGN KEY (listing_id) 
        REFERENCES food_listings(listing_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_claim_ngo FOREIGN KEY (ngo_id) 
        REFERENCES ngos(ngo_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Table 6: NOTIFICATIONS
-- Alerts sent to NGOs and Donors regarding food availability & status updates
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_type ENUM('ngo', 'user') NOT NULL,
    ngo_id INT NULL,
    user_id INT NULL,
    listing_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notify_ngo FOREIGN KEY (ngo_id) 
        REFERENCES ngos(ngo_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notify_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notify_listing FOREIGN KEY (listing_id) 
        REFERENCES food_listings(listing_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Table 7: NGO_DECLINED_LISTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ngo_declined_listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ngo_id INT NOT NULL,
    listing_id INT NOT NULL,
    declined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ngo_declined_listing (ngo_id, listing_id),
    CONSTRAINT fk_declined_ngo FOREIGN KEY (ngo_id)
        REFERENCES ngos(ngo_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_declined_listing FOREIGN KEY (listing_id)
        REFERENCES food_listings(listing_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================
CREATE INDEX idx_food_status_city ON food_listings(status, university_id);
CREATE INDEX idx_food_expiry ON food_listings(expiry_time);
CREATE INDEX idx_ngo_city ON ngos(city, is_verified);
CREATE INDEX idx_notification_ngo ON notifications(ngo_id, is_read);

-- ============================================================================
-- TRIGGERS (Core DBMS requirement)
-- ============================================================================

DELIMITER $$

-- Trigger 1: Auto-notify NGOs in the same city when a new food item is posted
CREATE TRIGGER trg_after_food_listing_insert
AFTER INSERT ON food_listings
FOR EACH ROW
BEGIN
    DECLARE univ_name VARCHAR(150);
    DECLARE univ_city VARCHAR(100);

    -- Fetch the university name and city
    SELECT name, city INTO univ_name, univ_city 
    FROM universities 
    WHERE university_id = NEW.university_id;

    -- Insert notification for all verified NGOs in that same city
    INSERT INTO notifications (recipient_type, ngo_id, listing_id, title, message)
    SELECT 
        'ngo',
        n.ngo_id,
        NEW.listing_id,
        CONCAT('Surplus Food Alert: ', univ_name),
        CONCAT(NEW.food_title, ' (', NEW.quantity_servings, ' servings) is available for pickup at ', univ_name, ', ', NEW.pickup_location, '. Expiry: ', DATE_FORMAT(NEW.expiry_time, '%d %b %H:%i'))
    FROM ngos n
    WHERE n.city = univ_city AND n.is_verified = TRUE;
END$$

-- Trigger 2: Prevent claiming expired food or already claimed food
CREATE TRIGGER trg_before_claim_insert
BEFORE INSERT ON claims
FOR EACH ROW
BEGIN
    DECLARE item_status VARCHAR(20);
    DECLARE item_expiry DATETIME;

    SELECT status, expiry_time INTO item_status, item_expiry
    FROM food_listings
    WHERE listing_id = NEW.listing_id;

    IF item_status != 'available' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: This food item is not available for claim.';
    END IF;

    IF item_expiry <= NOW() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Cannot claim food that has already expired.';
    END IF;
END$$

-- Trigger 3: Automatically update food_listings status to 'claimed' after claim insertion
CREATE TRIGGER trg_after_claim_insert
AFTER INSERT ON claims
FOR EACH ROW
BEGIN
    UPDATE food_listings 
    SET status = 'claimed'
    WHERE listing_id = NEW.listing_id;

    -- Notify the student/canteen donor that an NGO has claimed the food
    INSERT INTO notifications (recipient_type, user_id, listing_id, title, message)
    SELECT 
        'user',
        f.donor_id,
        NEW.listing_id,
        'Food Claimed by NGO!',
        CONCAT('Great news! ', n.name, ' has claimed your listing: "', f.food_title, '". Expected pickup: ', DATE_FORMAT(NEW.expected_pickup_time, '%d %b %H:%i'))
    FROM food_listings f
    JOIN ngos n ON n.ngo_id = NEW.ngo_id
    WHERE f.listing_id = NEW.listing_id;
END$$

-- Trigger 4: Automatically update food listing status when pickup is completed
CREATE TRIGGER trg_after_claim_update
AFTER UPDATE ON claims
FOR EACH ROW
BEGIN
    IF NEW.claim_status = 'completed' AND OLD.claim_status != 'completed' THEN
        UPDATE food_listings
        SET status = 'collected'
        WHERE listing_id = NEW.listing_id;
    ELSEIF NEW.claim_status = 'cancelled' AND OLD.claim_status != 'cancelled' THEN
        UPDATE food_listings
        SET status = 'available'
        WHERE listing_id = NEW.listing_id;
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- VIEWS (Simplifies reporting and frontend queries)
-- ============================================================================

-- View 1: Active surplus food available right now with university details
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
    TIMESTAMPDIFF(MINUTE, NOW(), f.expiry_time) AS minutes_remaining,
    f.pickup_location,
    u.name AS university_name,
    u.city AS university_city,
    usr.full_name AS donor_name,
    usr.phone AS donor_phone
FROM food_listings f
JOIN universities u ON f.university_id = u.university_id
JOIN users usr ON f.donor_id = usr.user_id
WHERE f.status = 'available' 
  AND f.expiry_time > NOW()
ORDER BY f.expiry_time ASC;

-- View 2: University Impact Summary (how much food saved per campus)
CREATE OR REPLACE VIEW vw_university_impact_summary AS
SELECT 
    u.university_id,
    u.name AS university_name,
    u.city,
    COUNT(f.listing_id) AS total_listings_posted,
    SUM(CASE WHEN f.status = 'collected' THEN f.quantity_servings ELSE 0 END) AS total_servings_rescued,
    SUM(CASE WHEN f.status = 'available' AND f.expiry_time > NOW() THEN f.quantity_servings ELSE 0 END) AS current_active_servings,
    SUM(CASE WHEN f.status = 'expired' OR (f.status = 'available' AND f.expiry_time <= NOW()) THEN f.quantity_servings ELSE 0 END) AS wasted_servings
FROM universities u
LEFT JOIN food_listings f ON u.university_id = f.university_id
GROUP BY u.university_id, u.name, u.city;

-- ============================================================================
-- STORED PROCEDURE (Atomic transaction for claiming food)
-- ============================================================================

DELIMITER $$

CREATE PROCEDURE sp_claim_food(
    IN p_listing_id INT,
    IN p_ngo_id INT,
    IN p_expected_pickup DATETIME,
    IN p_volunteer_name VARCHAR(100),
    IN p_volunteer_phone VARCHAR(20)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Rollback if anything goes wrong
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Lock the row to prevent race conditions (two NGOs claiming simultaneously)
    SELECT listing_id, status 
    FROM food_listings 
    WHERE listing_id = p_listing_id 
    FOR UPDATE;

    -- Insert claim record (this will trigger trg_before_claim_insert and trg_after_claim_insert)
    INSERT INTO claims (listing_id, ngo_id, expected_pickup_time, volunteer_name, volunteer_phone)
    VALUES (p_listing_id, p_ngo_id, p_expected_pickup, p_volunteer_name, p_volunteer_phone);

    COMMIT;
END$$

DELIMITER ;
