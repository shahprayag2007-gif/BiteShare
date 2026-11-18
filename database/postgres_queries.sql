-- ============================================================================
-- Project: FoodBridge - Inter-University Surplus Food Waste Management
-- DBMS Course Evaluation & Viva Queries for PostgreSQL 18 (pgAdmin 4)
-- Database: campus_food_db
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Active & Available Surplus Food Listings in Bengaluru
-- (Demonstrates View usage, date arithmetic, and status filtering)
-- ----------------------------------------------------------------------------
SELECT 
    listing_id,
    food_title,
    food_category,
    food_source,
    quantity_servings,
    university_name,
    university_city,
    pickup_location,
    donor_name,
    donor_phone,
    minutes_remaining
FROM vw_available_food
ORDER BY expiry_time ASC;

-- ----------------------------------------------------------------------------
-- 2. Inter-University Food Rescue Performance Leaderboard
-- (Demonstrates LEFT JOIN, GROUP BY, conditional aggregation, NULLIF, and COALESCE)
-- ----------------------------------------------------------------------------
SELECT 
    u.university_id,
    u.name AS campus_name,
    u.short_code,
    u.city,
    COUNT(f.listing_id) AS total_batches_posted,
    COALESCE(SUM(CASE WHEN f.status = 'collected' THEN f.quantity_servings ELSE 0 END), 0) AS servings_rescued,
    COALESCE(SUM(f.quantity_servings), 0) AS total_servings_offered,
    ROUND(
        COALESCE(
            SUM(CASE WHEN f.status = 'collected' THEN f.quantity_servings ELSE 0 END) * 100.0 / 
            NULLIF(SUM(f.quantity_servings), 0), 0
        ), 1
    ) AS rescue_success_rate_pct,
    ROUND(
        COALESCE(SUM(CASE WHEN f.status = 'collected' THEN f.quantity_servings ELSE 0 END), 0) * 2.5, 1
    ) AS co2_averted_kg
FROM universities u
LEFT JOIN food_listings f ON u.university_id = f.university_id
GROUP BY u.university_id, u.name, u.short_code, u.city
ORDER BY servings_rescued DESC, total_servings_offered DESC;

-- ----------------------------------------------------------------------------
-- 3. Complex 5-Table Multi-Join: Active Volunteer Pickups in Transit
-- (Demonstrates multi-table INNER JOIN across listings, claims, NGOs, users, campuses)
-- ----------------------------------------------------------------------------
SELECT 
    c.claim_id,
    f.food_title,
    f.quantity_servings,
    f.pickup_location,
    u.name AS campus_name,
    donor.full_name AS donor_name,
    donor.phone AS donor_phone,
    ngo.name AS claiming_ngo,
    ngo.contact_person AS ngo_lead,
    ngo.phone AS ngo_office_phone,
    c.volunteer_name,
    c.volunteer_phone,
    c.expected_pickup_time,
    c.claim_status
FROM claims c
JOIN food_listings f ON c.listing_id = f.listing_id
JOIN universities u ON f.university_id = u.university_id
JOIN users donor ON f.donor_id = donor.user_id
JOIN ngos ngo ON c.ngo_id = ngo.ngo_id
WHERE c.claim_status = 'active';

-- ----------------------------------------------------------------------------
-- 4. Subquery: Find Verified NGOs that have NOT Yet Claimed Any Surplus Batches
-- (Demonstrates NOT EXISTS correlated subquery)
-- ----------------------------------------------------------------------------
SELECT 
    n.ngo_id, 
    n.name AS ngo_name, 
    n.registration_number,
    n.city, 
    n.contact_person,
    n.phone, 
    n.email
FROM ngos n
WHERE n.is_verified = TRUE
  AND NOT EXISTS (
      SELECT 1 FROM claims c WHERE c.ngo_id = n.ngo_id
  );

-- ----------------------------------------------------------------------------
-- 5. Food Source Distribution: Student Tiffins vs Canteen vs Hostel Mess
-- (Demonstrates aggregation, AVG portion calculation, and category grouping)
-- ----------------------------------------------------------------------------
SELECT 
    food_source,
    COUNT(*) AS total_donations,
    SUM(quantity_servings) AS total_volume_servings_or_kg,
    ROUND(AVG(quantity_servings), 1) AS avg_portion_per_post,
    COUNT(CASE WHEN status = 'collected' THEN 1 END) AS successful_rescues
FROM food_listings
GROUP BY food_source
ORDER BY total_volume_servings_or_kg DESC;

-- ----------------------------------------------------------------------------
-- 6. Environmental Impact Calculation: CO2 Emissions Averted from Landfills
-- (Formula: 1 kg food waste diverted = 2.5 kg CO2 equivalent prevented)
-- ----------------------------------------------------------------------------
SELECT 
    COUNT(CASE WHEN status = 'collected' THEN 1 END) AS completed_rescues,
    COALESCE(SUM(CASE WHEN status = 'collected' THEN quantity_servings ELSE 0 END), 0) AS total_kg_diverted,
    ROUND(
        COALESCE(SUM(CASE WHEN status = 'collected' THEN quantity_servings ELSE 0 END), 0) * 2.5, 2
    ) AS total_co2_emissions_averted_kg,
    ROUND(
        COALESCE(SUM(CASE WHEN status = 'collected' THEN quantity_servings ELSE 0 END), 0) * 2.5 / 1000.0, 3
    ) AS total_co2_metric_tons
FROM food_listings;

-- ----------------------------------------------------------------------------
-- 7. Audit Log: Persistent Declined Listings by NGO Partners
-- (Demonstrates the ngo_declined_listings table joining with listings & NGOs)
-- ----------------------------------------------------------------------------
SELECT 
    d.id AS decline_log_id,
    n.name AS ngo_name,
    f.food_title,
    f.quantity_servings,
    u.name AS campus_name,
    d.declined_at
FROM ngo_declined_listings d
JOIN ngos n ON d.ngo_id = n.ngo_id
JOIN food_listings f ON d.listing_id = f.listing_id
JOIN universities u ON f.university_id = u.university_id
ORDER BY d.declined_at DESC;

-- ----------------------------------------------------------------------------
-- 8. Transactional Concurrency Test: Stored Procedure Claim Call
-- (Demonstrates calling sp_claim_food with row-level locking)
-- ----------------------------------------------------------------------------
-- Note: Replace 2 with an active listing_id
-- CALL sp_claim_food(2, 1, CURRENT_TIMESTAMP + INTERVAL '1 hour', 'Ajay Deshmukh', '+91 98765 43210');

-- ----------------------------------------------------------------------------
-- 9. Trigger Audit: Verify Real-Time Alerts Generated for Verified NGOs
-- ----------------------------------------------------------------------------
SELECT 
    n.notification_id,
    ngo.name AS recipient_ngo,
    n.title,
    n.message,
    n.is_read,
    n.created_at
FROM notifications n
JOIN ngos ngo ON n.ngo_id = ngo.ngo_id
ORDER BY n.created_at DESC
LIMIT 10;
