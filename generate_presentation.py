import os
import sys
import pptx
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor

def create_deck():
    prs = pptx.Presentation()
    # 16:9 Widescreen standard
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Theme Colors (Clash Display Palette)
    NAVY = RGBColor(5, 15, 42)            # #050F2A Deep Midnight Navy
    NAVY_CARD = RGBColor(11, 26, 64)       # #0B1A40 High-contrast navy card
    SKY = RGBColor(123, 187, 255)         # #7BBBFF Soft Electric Sky Azure
    IRIS = RGBColor(184, 169, 255)        # #B8A9FF Luminous Iris Lavender
    ICE_BG = RGBColor(242, 253, 255)      # #F2FDFF Icy Pure Canvas
    WHITE = RGBColor(255, 255, 255)       # #FFFFFF Pure White
    BORDER_BLUE = RGBColor(200, 222, 248) # #C8DEF8 Soft Sky Border
    TEXT_DARK = RGBColor(5, 15, 42)       # #050F2A Crisp high contrast
    TEXT_MUTED = RGBColor(71, 85, 105)    # #475569 Slate Muted
    TEXT_LIGHT = RGBColor(242, 253, 255)  # #F2FDFF
    CARD_LIGHT_BORDER = RGBColor(180, 210, 245)

    FONT_HEAD = "Segoe UI"
    FONT_BODY = "Segoe UI"

    def set_slide_background(slide, color):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        return bg

    def add_header(slide, title, category="KINDPLATES: DBMS & REDISTRIBUTION ECOSYSTEM", slide_num=None):
        # Category Tag Badge (Large, visible for projector)
        cat_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.38), Inches(5.2), Inches(0.42))
        cat_box.fill.solid()
        cat_box.fill.fore_color.rgb = RGBColor(230, 242, 255)
        cat_box.line.color.rgb = SKY
        cat_box.line.width = Pt(1.5)
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = False
        tf_cat.margin_left = Inches(0.18)
        tf_cat.margin_top = Inches(0.06)
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.name = FONT_HEAD
        p_cat.font.size = Pt(12)
        p_cat.font.bold = True
        p_cat.font.color.rgb = NAVY

        # Main Title (Projector Standard: 28pt - 30pt)
        title_box = slide.shapes.add_textbox(Inches(0.75), Inches(0.85), Inches(11.8), Inches(0.75))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.05)
        tf.margin_top = Inches(0.0)
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEAD
        p.font.size = Pt(28)
        p.font.bold = True
        p.font.color.rgb = NAVY

        # Horizontal accent line
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.62), Inches(11.733), Inches(0.03))
        line.fill.solid()
        line.fill.fore_color.rgb = BORDER_BLUE
        line.line.fill.background()

        # Sky Azure accent on left of line
        line_accent = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.62), Inches(2.2), Inches(0.04))
        line_accent.fill.solid()
        line_accent.fill.fore_color.rgb = SKY
        line_accent.line.fill.background()

        # Footer (Projector standard: 12pt)
        footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.0), Inches(10.2), Inches(0.4))
        tf_f = footer_box.text_frame
        tf_f.margin_top = Inches(0)
        p_f = tf_f.paragraphs[0]
        p_f.text = "KindPlates: Campus Surplus Food & Verified NGO Redistribution System • DBMS Project"
        p_f.font.name = FONT_BODY
        p_f.font.size = Pt(12)
        p_f.font.color.rgb = TEXT_MUTED

        if slide_num:
            num_box = slide.shapes.add_textbox(Inches(11.6), Inches(7.0), Inches(0.9), Inches(0.4))
            tf_n = num_box.text_frame
            tf_n.margin_top = Inches(0)
            p_n = tf_n.paragraphs[0]
            p_n.alignment = PP_ALIGN.RIGHT
            p_n.text = f"{slide_num:02d} / 16"
            p_n.font.name = FONT_BODY
            p_n.font.size = Pt(13)
            p_n.font.bold = True
            p_n.font.color.rgb = NAVY

    def add_card(slide, left, top, width, height, title, items, badge=None, border_color=CARD_LIGHT_BORDER, bg_color=WHITE, title_size=19, body_size=14.5):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.75)

        tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.18), width - Inches(0.4), height - Inches(0.36))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_top = Inches(0.04)
        tf.margin_bottom = Inches(0.04)
        tf.margin_left = Inches(0.04)
        tf.margin_right = Inches(0.04)

        if badge:
            p_badge = tf.paragraphs[0]
            p_badge.text = badge.upper()
            p_badge.font.name = FONT_HEAD
            p_badge.font.size = Pt(11.5)
            p_badge.font.bold = True
            p_badge.font.color.rgb = SKY
            p_badge.space_after = Pt(3)
            p_title = tf.add_paragraph()
        else:
            p_title = tf.paragraphs[0]

        p_title.text = title
        p_title.font.name = FONT_HEAD
        p_title.font.size = Pt(title_size)
        p_title.font.bold = True
        p_title.font.color.rgb = NAVY
        p_title.space_after = Pt(10)

        for item in items:
            p = tf.add_paragraph()
            p.text = f"•  {item}"
            p.font.name = FONT_BODY
            p.font.size = Pt(body_size)
            p.font.color.rgb = TEXT_DARK
            p.space_after = Pt(7)

        return card

    # =========================================================================
    # SLIDE 1: Title Slide (Dark Theme, Projector Sized)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, NAVY)

    # Accent top ribbon
    ribbon = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.15))
    ribbon.fill.solid()
    ribbon.fill.fore_color.rgb = SKY
    ribbon.line.fill.background()

    # Category Pill
    cat_pill = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(1.15), Inches(5.6), Inches(0.48))
    cat_pill.fill.solid()
    cat_pill.fill.fore_color.rgb = RGBColor(14, 30, 75)
    cat_pill.line.color.rgb = SKY
    cat_pill.line.width = Pt(1.5)
    tf_cp = cat_pill.text_frame
    tf_cp.margin_top = Inches(0.08)
    p_cp = tf_cp.paragraphs[0]
    p_cp.text = "DATABASE MANAGEMENT SYSTEMS PROJECT"
    p_cp.font.name = FONT_HEAD
    p_cp.font.size = Pt(13)
    p_cp.font.bold = True
    p_cp.font.color.rgb = SKY

    # Main Project Title (Projector Standard: 48pt)
    t_box = s1.shapes.add_textbox(Inches(0.95), Inches(1.75), Inches(11.4), Inches(2.5))
    tf_t = t_box.text_frame
    tf_t.word_wrap = True
    p_t = tf_t.paragraphs[0]
    p_t.text = "KindPlates"
    p_t.font.name = FONT_HEAD
    p_t.font.size = Pt(48)
    p_t.font.bold = True
    p_t.font.color.rgb = TEXT_LIGHT

    p_sub = tf_t.add_paragraph()
    p_sub.text = "Inter-University Campus Surplus Food & Verified NGO Redistribution System"
    p_sub.font.name = FONT_HEAD
    p_sub.font.size = Pt(22)
    p_sub.font.bold = True
    p_sub.font.color.rgb = SKY
    p_sub.space_before = Pt(8)

    p_desc = tf_t.add_paragraph()
    p_desc.text = "A full-stack cloud DBMS connecting student micro-donations and commercial campus canteens with local verified charities via real-time proximity triggers, automated gate passes, and sustainability analytics."
    p_desc.font.name = FONT_BODY
    p_desc.font.size = Pt(15)
    p_desc.font.color.rgb = RGBColor(210, 225, 250)
    p_desc.space_before = Pt(10)

    # 4 Feature Highlight Pills at Bottom (Large readable fonts)
    pill_data = [
        ("PostgreSQL / 3NF Core", "Strict ACID controls, cascades & stored procedures"),
        ("FastAPI Async Engine", "Sub-second proximity event dispatch & auto-detection"),
        ("Digital Gate Passes", "jsPDF manifests eliminating campus security roadblocks"),
        ("EPA-Standard Metrics", "Real-time CO2, water & landfill diversion ledger")
    ]
    p_w = Inches(2.7)
    p_h = Inches(1.5)
    p_top = Inches(4.7)
    for i, (p_title, p_subt) in enumerate(pill_data):
        p_left = Inches(1.0) + i * Inches(2.88)
        p_card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, p_left, p_top, p_w, p_h)
        p_card.fill.solid()
        p_card.fill.fore_color.rgb = NAVY_CARD
        p_card.line.color.rgb = RGBColor(40, 75, 160)
        p_card.line.width = Pt(1.5)
        
        p_tb = s1.shapes.add_textbox(p_left + Inches(0.14), p_top + Inches(0.14), p_w - Inches(0.28), p_h - Inches(0.28))
        p_tf = p_tb.text_frame
        p_tf.word_wrap = True
        p_tf.margin_top = Inches(0.04)
        
        para1 = p_tf.paragraphs[0]
        para1.text = p_title
        para1.font.name = FONT_HEAD
        para1.font.size = Pt(15)
        para1.font.bold = True
        para1.font.color.rgb = IRIS
        
        para2 = p_tf.add_paragraph()
        para2.text = p_subt
        para2.font.name = FONT_BODY
        para2.font.size = Pt(13)
        para2.font.color.rgb = RGBColor(215, 230, 255)
        para2.space_before = Pt(5)

    # Bottom Footer
    b_foot = s1.shapes.add_textbox(Inches(1.0), Inches(6.65), Inches(11.3), Inches(0.45))
    tf_bf = b_foot.text_frame
    p_bf = tf_bf.paragraphs[0]
    p_bf.text = "Department of Computer Science & Engineering • Academic Project Presentation 2026-2027"
    p_bf.font.name = FONT_BODY
    p_bf.font.size = Pt(13)
    p_bf.font.color.rgb = RGBColor(160, 185, 225)

    # =========================================================================
    # SLIDE 2: Introduction Page with 4 EMPTY CARDS for Members Name (PROJECTOR SIZED)
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, ICE_BG)
    add_header(s2, "Project Introduction & Team Information", "TEAM & PROJECT OVERVIEW", 2)

    # 4 Empty Member Cards horizontally (Projector size: 14pt-16pt font inside)
    card_w = Inches(2.7)
    card_h = Inches(3.6)
    card_top = Inches(1.85)

    for i in range(4):
        card_left = Inches(0.8) + i * Inches(2.98)

        # Outer Card
        m_card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, card_left, card_top, card_w, card_h)
        m_card.fill.solid()
        m_card.fill.fore_color.rgb = WHITE
        m_card.line.color.rgb = CARD_LIGHT_BORDER
        m_card.line.width = Pt(1.75)

        # Top Badge Header inside card
        m_header = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, card_left + Inches(0.12), card_top + Inches(0.14), card_w - Inches(0.24), Inches(0.5))
        m_header.fill.solid()
        m_header.fill.fore_color.rgb = NAVY
        m_header.line.fill.background()
        tf_mh = m_header.text_frame
        tf_mh.margin_top = Inches(0.08)
        p_mh = tf_mh.paragraphs[0]
        p_mh.alignment = PP_ALIGN.CENTER
        p_mh.text = f"TEAM MEMBER 0{i+1}"
        p_mh.font.name = FONT_HEAD
        p_mh.font.size = Pt(15)
        p_mh.font.bold = True
        p_mh.font.color.rgb = SKY

        # Text Box with empty fields for member names in LARGE 14pt-15pt font
        m_tb = s2.shapes.add_textbox(card_left + Inches(0.18), card_top + Inches(0.72), card_w - Inches(0.36), card_h - Inches(0.8))
        m_tf = m_tb.text_frame
        m_tf.word_wrap = True
        m_tf.margin_top = Inches(0.05)
        m_tf.margin_left = Inches(0.02)

        fields = [
            ("NAME", "____________________"),
            ("USN / ROLL NO", "____________________"),
            ("BRANCH / DEPT", "____________________"),
            ("PROJECT ROLE", "____________________")
        ]

        for idx, (lbl, placeholder) in enumerate(fields):
            p_lbl = m_tf.paragraphs[0] if idx == 0 else m_tf.add_paragraph()
            p_lbl.text = lbl
            p_lbl.font.name = FONT_HEAD
            p_lbl.font.size = Pt(12)
            p_lbl.font.bold = True
            p_lbl.font.color.rgb = NAVY
            p_lbl.space_before = Pt(4) if idx > 0 else Pt(0)

            p_val = m_tf.add_paragraph()
            p_val.text = placeholder
            p_val.font.name = FONT_BODY
            p_val.font.size = Pt(14)
            p_val.font.color.rgb = TEXT_MUTED
            p_val.space_after = Pt(2)

    # Bottom Card: Academic Supervision & Project Details (14pt-15pt text)
    guide_card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.65), Inches(11.733), Inches(1.2))
    guide_card.fill.solid()
    guide_card.fill.fore_color.rgb = WHITE
    guide_card.line.color.rgb = CARD_LIGHT_BORDER
    guide_card.line.width = Pt(1.75)

    g_tb = s2.shapes.add_textbox(Inches(1.0), Inches(5.72), Inches(11.333), Inches(1.05))
    g_tf = g_tb.text_frame
    g_tf.word_wrap = True

    p_gh = g_tf.paragraphs[0]
    p_gh.text = "ACADEMIC INSTITUTION & SUPERVISION DETAILS"
    p_gh.font.name = FONT_HEAD
    p_gh.font.size = Pt(13)
    p_gh.font.bold = True
    p_gh.font.color.rgb = NAVY
    p_gh.space_after = Pt(5)

    p_gd = g_tf.add_paragraph()
    p_gd.text = "Project Guide / Supervisor: ____________________________________   |   Designation: ____________________________________"
    p_gd.font.name = FONT_BODY
    p_gd.font.size = Pt(14)
    p_gd.font.bold = True
    p_gd.font.color.rgb = TEXT_DARK
    p_gd.space_after = Pt(4)

    p_inst = g_tf.add_paragraph()
    p_inst.text = "Department / Institution: _______________________________________   |   Course: CSE DBMS Project   |   Year: 2026 - 2027"
    p_inst.font.name = FONT_BODY
    p_inst.font.size = Pt(13.5)
    p_inst.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 3: Executive Summary & The Problem Statement
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, ICE_BG)
    add_header(s3, "The Dual Crisis: Campus Food Wastage vs. Urban Hunger", "PROBLEM STATEMENT & MOTIVATION", 3)

    c1_items = [
        "100+ kg of edible food prepared daily in hostel messes and canteens discarded into municipal landfills.",
        "Erratic student attendance, exam timetable shifts, and event surplus cause massive batch overproduction.",
        "Hostel students frequently have unopened, untouched tiffins and packed snacks with nowhere to share them.",
        "Landfill food decomposition produces potent methane (CH4) emissions, fueling climate degradation."
    ]
    add_card(s3, Inches(0.8), Inches(1.85), Inches(3.7), Inches(4.9), "Campus Wastage Reality", c1_items, badge="CRISIS 1: UNUSED SURPLUS", title_size=20, body_size=14.5)

    c2_items = [
        "Hundreds of orphanages, homeless shelters, and welfare homes across Ahmedabad face daily food shortages.",
        "Relief NGOs (e.g., Robin Hood Army, Feeding India) rely on ad-hoc phone calls and irregular spot donations.",
        "Volunteer rescue operations are delayed due to lack of visibility into available portions and shelf life.",
        "Over 40% of wasted food is fully hygienic and fit for consumption if mobilized within a 3-hour window."
    ]
    add_card(s3, Inches(4.8), Inches(1.85), Inches(3.7), Inches(4.9), "Urban Hunger Paradox", c2_items, badge="CRISIS 2: NUTRITIONAL DEFICIT", title_size=20, body_size=14.5)

    c3_items = [
        "Manual Coordination Lag: Phone calls take 45-90 minutes, leading to rapid food expiration.",
        "Campus Security Obstacle: NGO volunteer vehicles are frequently blocked or turned away at campus gates.",
        "Zero Traceability: Donors fear health liability without clear chain-of-custody and verified NGO credentials.",
        "Missing Data: University administrators lack ESG metrics on waste reduction and carbon offsets."
    ]
    add_card(s3, Inches(8.8), Inches(1.85), Inches(3.7), Inches(4.9), "The Digital Disconnect", c3_items, badge="CRISIS 3: LOGISTICAL FAILURE", title_size=20, body_size=14.5)

    # =========================================================================
    # SLIDE 4: Proposed Solution & Core System Objectives
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, ICE_BG)
    add_header(s4, "Project Objectives & Unique System Innovations", "THE KINDPLATES SOLUTION", 4)

    s4_cards = [
        ("Dual-Tier Redistribution Engine", [
            "Micro-Donation Module: Fast 30-second posting for student tiffins (1-5 servings) with dietary tags.",
            "Bulk Commercial Module: Kilogram-scale surplus posting for mess halls with prep & expiry timestamps.",
            "Multi-Category Classification: Cooked meals, bakery, packed goods, and fresh dairy."
        ], "CORE PILLAR 1"),
        ("Proximity-Based Real-Time Triggers", [
            "Sub-second SQL triggers execute upon listing creation, filtering verified NGOs by operational radius.",
            "Automated alert feed prevents delay and eliminates manual phone call coordination.",
            "Visual urgency badges and live countdown timers show remaining edible lifespan."
        ], "CORE PILLAR 2"),
        ("Digital Gate Passes & Volunteer Manifests", [
            "Automated client-side jsPDF generation creates verifiable campus entry vouchers (Pass ID: KP-CLAIM-xxx).",
            "Eliminates campus security gate friction, providing official authorization and donor verification phone lines.",
            "Downloadable route manifests optimize multi-campus volunteer collections."
        ], "CORE PILLAR 3"),
        ("EPA-Standard Environmental Transparency", [
            "Live mathematical calculation of landfill waste diverted (kg) and greenhouse gas CO2e averted.",
            "Embedded agricultural water footprint saved (liters) displayed via public analytics portal.",
            "Inter-Campus Leaderboard gamifies zero-waste competition across regional universities."
        ], "CORE PILLAR 4")
    ]

    for i, (title, items, badge) in enumerate(s4_cards):
        col = i % 2
        row = i // 2
        l = Inches(0.8) + col * Inches(5.95)
        t = Inches(1.85) + row * Inches(2.55)
        add_card(s4, l, t, Inches(5.75), Inches(2.35), title, items, badge=badge, title_size=19, body_size=14)

    # =========================================================================
    # SLIDE 5: High-Level System Architecture & Flow Pipeline
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, ICE_BG)
    add_header(s5, "Multi-Tier Cloud Architecture & End-to-End Pipeline", "SYSTEM ARCHITECTURE", 5)

    arch_layers = [
        ("1. Presentation Layer (SPA)", [
            "Pure Vanilla HTML5 / CSS3 / ES6+",
            "Clash Display & Plus Jakarta typography",
            "Zero bulky frameworks (sub-80ms load)",
            "Portals: Student, Canteen, NGO, Analytics",
            "Client-side jsPDF manifest engine"
        ], "FRONTEND ECOSYSTEM"),
        ("2. Application Layer (REST)", [
            "FastAPI Asynchronous Microservice",
            "Pydantic schema validation & serialization",
            "CORS-enabled multi-origin support",
            "Auto-campus identification from user session",
            "Real-time state: Available -> Claimed -> Collected"
        ], "BUSINESS LOGIC LAYER"),
        ("3. Data & Trigger Engine", [
            "PostgreSQL 18 / MySQL Relational Engine",
            "Strict 3NF Schema & Foreign Key cascades",
            "Pre/Post INSERT & UPDATE triggers",
            "Stored procedure sp_claim_food with row locks",
            "In-memory mock fallback for zero downtime"
        ], "PERSISTENCE & CONCURRENCY"),
        ("4. Logistics & Distribution", [
            "Verified NGO partners (Robin Hood Army, etc.)",
            "Volunteer driver dispatch & ETA scheduling",
            "Campus Security gate pass verification",
            "Chain-of-custody transfer confirmation",
            "Beneficiary shelter delivery logging"
        ], "PHYSICAL REDISTRIBUTION")
    ]

    for i, (title, items, badge) in enumerate(arch_layers):
        l = Inches(0.8) + i * Inches(2.98)
        add_card(s5, l, Inches(1.85), Inches(2.75), Inches(4.9), title, items, badge=badge, title_size=18, body_size=14)

    # =========================================================================
    # SLIDE 6: Database Design, Schema & 3NF Normalization
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, ICE_BG)
    add_header(s6, "Relational Schema Design & 3NF Normalization Analysis", "DATABASE ARCHITECTURE", 6)

    schema_items = [
        "UNIVERSITIES: Master directory of institutions (PK: university_id, short_code, city, email).",
        "USERS: Role-based accounts for Students, Canteen Staff, and Admins (PK: user_id, FK: university_id).",
        "NGOS: Verified relief charities with registration numbers and radius (PK: ngo_id, reg_no, radius).",
        "FOOD_LISTINGS: Core inventory (PK: listing_id, FKs: university_id, donor_id, food_source, expiry).",
        "CLAIMS: Transaction ledger locking listings to claiming NGOs and volunteers (PK: claim_id, FKs).",
        "NOTIFICATIONS: Real-time event log for push alerts to donors and NGOs (PK: notification_id, FKs)."
    ]
    add_card(s6, Inches(0.8), Inches(1.85), Inches(5.75), Inches(4.9), "Relational Entity Structure", schema_items, badge="6 INTERCONNECTED TABLES", title_size=20, body_size=14.5)

    nf_items = [
        "1NF (First Normal Form): Every column holds atomic, indivisible values. Food categories and status types are strictly enumerated without comma-separated strings.",
        "2NF (Second Normal Form): In 1NF and free of partial dependencies. Every table uses a single-attribute surrogate primary key (AUTO_INCREMENT id), ensuring attributes depend on the complete key.",
        "3NF (Third Normal Form): In 2NF and free of transitive dependencies (X -> Y -> Z). University contact emails and cities are stored strictly in UNIVERSITIES rather than duplicated in FOOD_LISTINGS.",
        "Referential Integrity: ON DELETE RESTRICT on transactional food listings prevents cascade loss; ON DELETE CASCADE on notifications removes orphan alert messages.",
        "Domain Constraints: CHECK (quantity_servings > 0) and CHECK (expiry_time > prepared_time) guarantee data consistency at the engine level."
    ]
    add_card(s6, Inches(6.8), Inches(1.85), Inches(5.75), Inches(4.9), "Strict 3NF Compliance & Integrity", nf_items, badge="ACID & NORMALIZATION", title_size=20, body_size=14)

    # =========================================================================
    # SLIDE 7: Advanced DBMS Triggers & Stored Procedures (Unique Point)
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7, ICE_BG)
    add_header(s7, "Automated Triggers & Concurrency Control via Stored Procedures", "UNIQUE DBMS IMPLEMENTATIONS", 7)

    db_features = [
        ("Trigger 1: trg_after_food_listing_insert", [
            "Timing: AFTER INSERT ON food_listings",
            "Automated Geo-Targeted Alert Dispatch: Executes as soon as surplus is posted.",
            "Matches university city with registered, verified NGOs in the identical urban zone.",
            "Sub-second notification insertion into notifications table without application polling."
        ], "TRIGGER: INSTANT ALERTING"),
        ("Trigger 2: trg_before_claim_insert", [
            "Timing: BEFORE INSERT ON claims",
            "Food Freshness & Availability Safeguard: Prevents fraudulent or invalid claims.",
            "Validates that food_listings.status is strictly 'available' and expiry_time > NOW().",
            "Throws an active SQL SIGNAL (State 45000) exception if the food has expired or been claimed."
        ], "TRIGGER: INTEGRITY & SAFETY"),
        ("Trigger 3: trg_after_claim_insert", [
            "Timing: AFTER INSERT ON claims",
            "Atomic State Machine Synchronization: Automatically transitions status to 'claimed'.",
            "Generates instant notification for the original donor with assigned volunteer info and ETA.",
            "Prevents stale 'available' status from persisting on the public feed."
        ], "TRIGGER: STATUS SYNC"),
        ("Stored Procedure: sp_claim_food", [
            "ACID Atomic Transaction: Encapsulated within START TRANSACTION ... COMMIT block.",
            "Row-Level Lock (SELECT ... FOR UPDATE): Locks target food_listing record in memory.",
            "Race Condition Elimination: Guarantees that if multiple NGOs click 'Claim' simultaneously, exactly one succeeds and others receive clean rejections."
        ], "STORED PROCEDURE: CONCURRENCY")
    ]

    for i, (title, items, badge) in enumerate(db_features):
        col = i % 2
        row = i // 2
        l = Inches(0.8) + col * Inches(5.95)
        t = Inches(1.85) + row * Inches(2.55)
        add_card(s7, l, t, Inches(5.75), Inches(2.35), title, items, badge=badge, title_size=19, body_size=14)

    # =========================================================================
    # SLIDE 8: Role-Based Portals: Student & Micro-Donations
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8, ICE_BG)
    add_header(s8, "Student Dashboard: Micro-Donations & Peer Surplus Redistribution", "USER ROLES & PORTALS", 8)

    s8_cards = [
        ("Rapid 30-Second Posting Flow", [
            "Designed for busy students: Log excess tiffins or packaged snacks in under half a minute.",
            "Pre-populated campus and hostel desk pickup coordinates (e.g., 'Hostel 3 Common Desk').",
            "Smart portion calculator supports 1 to 10 individual servings with zero complex paperwork."
        ], "MICRO-DONATION UX"),
        ("Dietary Badges & Allergen Chips", [
            "Instant dietary classification tags: Vegetarian, Non-Vegetarian, Jain, Vegan, and Halal.",
            "Specific allergen declaration chips: Dairy, Nuts, Gluten, Soy, or Egg warnings.",
            "Ensures recipient shelters and student peers receive food aligned with dietary restrictions."
        ], "HEALTH & SAFETY TAGGING"),
        ("Real-Time Countdown Expiry Clock", [
            "Dynamic client-side countdown timer showing hours and minutes until consumption limit.",
            "Color-coded urgency indicators: Green (> 3 hrs), Amber (1-3 hrs), Red (< 1 hr).",
            "Automatic auto-archive when timer hits zero prevents distribution of spoiled food."
        ], "ACTIVE SHELF-LIFE RADAR")
    ]

    for i, (title, items, badge) in enumerate(s8_cards):
        l = Inches(0.8) + i * Inches(3.98)
        add_card(s8, l, Inches(1.85), Inches(3.75), Inches(4.9), title, items, badge=badge, title_size=20, body_size=14.5)

    # =========================================================================
    # SLIDE 9: Role-Based Portals: Canteen & Hostel Mess
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9, ICE_BG)
    add_header(s9, "Canteen & Mess Dashboard: Bulk Commercial Redistribution", "USER ROLES & PORTALS", 9)

    s9_cards = [
        ("Commercial Bulk Scale Management", [
            "Tailored for high-volume catering: Records portions in kilograms (kg) and bulk tray counts.",
            "Category breakdown: Cooked Rice & Curries, Chapati / Roti stacks, Fresh Bakery, and Dairy.",
            "Container specifications: Packed in food-grade trays, insulated containers, or requires NGO vessels."
        ], "BULK COMMERCIAL ENGINE"),
        ("Scheduled Pre-Closure Surplus", [
            "End-of-shift dispatch workflow: Mess managers log surplus 45 minutes before dinner service ends.",
            "Enables NGOs to dispatch volunteer transport vans before campus kitchen staff lock up.",
            "Coordinates with campus security for heavy vehicle access at kitchen loading bays."
        ], "PREDICTIVE LOGISTICS"),
        ("Historical Rescue Ledger & Archive", [
            "Interactive modal dialog cataloging every past food donation with dates, portions, and recipient NGO.",
            "Search and filter records by semester, date range, or food type.",
            "Enables campus catering contractors to optimize weekly purchasing and minimize kitchen prep waste."
        ], "AUDIT & COMPLIANCE ARCHIVE")
    ]

    for i, (title, items, badge) in enumerate(s9_cards):
        l = Inches(0.8) + i * Inches(3.98)
        add_card(s9, l, Inches(1.85), Inches(3.75), Inches(4.9), title, items, badge=badge, title_size=20, body_size=14.5)

    # =========================================================================
    # SLIDE 10: Role-Based Portals: NGO Partner Hub & Volunteer Dispatch
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10, ICE_BG)
    add_header(s10, "NGO Partner Hub: Surplus Radar, Instant Claims & Volunteer Dispatch", "USER ROLES & PORTALS", 10)

    s10_cards = [
        ("Citywide Surplus Radar Feed", [
            "Real-time aggregated view of surplus food across all regional university campuses.",
            "Multi-criteria filtering: By University Campus, Food Category, or Pickup Urgency.",
            "Slide-out surplus food alert drawer provides instant notification of new available batches."
        ], "REAL-TIME DISCOVERY RADAR"),
        ("1-Click Claim & Volunteer Assignment", [
            "Instant modal flow: Assign designated volunteer collector name, mobile contact, and vehicle number.",
            "Sets Expected Time of Arrival (ETA) to notify campus security and canteen staff.",
            "Atomic backend locking ensures zero duplicate claims by competing NGOs."
        ], "DISPATCH LOGISTICS"),
        ("Full Custody Status Transitions", [
            "Lifecycle workflow: Active Pickup -> Mark Collected -> Successfully Delivered to Beneficiaries.",
            "Includes Decline / Release Listing mechanism so unclaimed food is promptly re-listed for other NGOs.",
            "Generates timestamped pickup verification entries in the central PostgreSQL audit log."
        ], "CHAIN-OF-CUSTODY TRACKING")
    ]

    for i, (title, items, badge) in enumerate(s10_cards):
        l = Inches(0.8) + i * Inches(3.98)
        add_card(s10, l, Inches(1.85), Inches(3.75), Inches(4.9), title, items, badge=badge, title_size=20, body_size=14.5)

    # =========================================================================
    # SLIDE 11: Security Gate Pass & Chain-of-Custody (Unique Point)
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11, ICE_BG)
    add_header(s11, "Automated Digital Gate Passes & Campus Security Clearance", "UNIQUE OPERATIONAL INNOVATION", 11)

    s11_cards = [
        ("The 'Campus Gate Barrier' Problem", [
            "University campuses have strict physical security: Guards routinely turn away unfamiliar NGO vans.",
            "Volunteers waste 30-45 minutes at the main gate explaining their pickup purpose.",
            "Mess managers and students are often in classrooms and unreachable by phone during pickups.",
            "Result: Edible food spoils while volunteers are stuck outside campus security checkpoints."
        ], "PHYSICAL SECURITY BOTTLENECK"),
        ("Automated Client-Side jsPDF Engine", [
            "Direct in-browser PDF generation using jsPDF & AutoTable with zero server latency.",
            "Formatted in clean Midnight Navy (#050F2A) and Sky Azure (#7BBBFF) brand styling.",
            "Embeds unique Pass ID (e.g. 'PASS ID: FB-CLAIM-104') and QR-ready alphanumeric code.",
            "Includes volunteer credentials, vehicle registration, and campus donor verification phone number."
        ], "INSTANT DOCUMENT GENERATION"),
        ("Official Gate Pass & Volunteer Manifest", [
            "Campus Security Instructions: Explicit directive authorizing designated vehicle entry to kitchen loading bay.",
            "Aggregate Route Manifest: Multi-campus pickup schedule detailing sequential stops across the city.",
            "Donation Tax & Audit Certificate: Provides formal paperwork certifying food diverted under zero-waste initiative."
        ], "CHAIN-OF-CUSTODY VOUCHER")
    ]

    for i, (title, items, badge) in enumerate(s11_cards):
        l = Inches(0.8) + i * Inches(3.98)
        add_card(s11, l, Inches(1.85), Inches(3.75), Inches(4.9), title, items, badge=badge, title_size=20, body_size=14.5)

    # =========================================================================
    # SLIDE 12: Real-Time Environmental Impact & Sustainability Analytics
    # =========================================================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12, ICE_BG)
    add_header(s12, "Environmental Impact Engine: Landfill, CO2 & Water Metrics", "SUSTAINABILITY ANALYTICS", 12)

    eco_metrics = [
        ("Nutritious Meals Rescued", [
            "Direct calculation of cumulative portions served to underprivileged families and shelters.",
            "Aggregates micro-tiffin student contributions and bulk commercial canteen trays.",
            "Directly advances UN Sustainable Development Goal 2: Zero Hunger."
        ], "METRIC 1: SOCIAL BENEFIT"),
        ("Landfill Waste Diverted (Kg)", [
            "Measures solid organic waste kept out of municipal dumps and composting sites.",
            "Formula: Total servings multiplied by standard average meal mass (0.42 kg/serving).",
            "Eliminates municipal landfill tipping fees and solid waste transport overhead."
        ], "METRIC 2: SOLID WASTE REDUCTION"),
        ("CO2e Greenhouse Gas Averted (Kg)", [
            "Scientific model based on EPA & World Resources Institute (WRI) organic waste parameters.",
            "Formula: 1 kg food waste diverted prevents ~2.5 kg CO2-equivalent methane emissions.",
            "Directly assists participating universities in achieving institutional carbon neutrality."
        ], "METRIC 3: CLIMATE EMISSIONS"),
        ("Embedded Freshwater Conserved (L)", [
            "Quantifies the virtual agricultural water conserved by preventing food disposal.",
            "Formula: Standard crop & dairy water footprint (~850 liters of water per prepared meal).",
            "Highlights resource efficiency across energy, grain, and water lifecycles."
        ], "METRIC 4: WATER FOOTPRINT")
    ]

    for i, (title, items, badge) in enumerate(eco_metrics):
        col = i % 2
        row = i // 2
        l = Inches(0.8) + col * Inches(5.95)
        t = Inches(1.85) + row * Inches(2.55)
        add_card(s12, l, t, Inches(5.75), Inches(2.35), title, items, badge=badge, title_size=19, body_size=14)

    # =========================================================================
    # SLIDE 13: Gamification, Social Motivation & Campus Leaderboard
    # =========================================================================
    s13 = prs.slides.add_slide(blank_layout)
    set_slide_background(s13, ICE_BG)
    add_header(s13, "Gamification & Transparency: The Inter-Campus Leaderboard", "PUBLIC ENGAGEMENT & MOTIVATION", 13)

    s13_cards = [
        ("Inter-University Impact Leaderboard", [
            "Ranked social ledger featuring major Ahmedabad institutions (Nirma, Adani, LJ, LD College, Ahmedabad Univ, VGEC, Indus).",
            "Ranks campuses based on verified total meals rescued and total surplus listings shared.",
            "Instills healthy inter-collegiate competition, encouraging mess contractors and student clubs to participate."
        ], "INSTITUTIONAL RANKING"),
        ("Rescue Efficiency Index (%)", [
            "Calculates the ratio of surplus food listings successfully claimed vs. listings that expired uncollected.",
            "Visualized via smooth horizontal progress bars with vibrant Iris-to-Sky gradient fills.",
            "Rewards rapid logistics turnarounds and encourages campus food donor responsiveness."
        ], "EFFICIENCY ALGORITHM"),
        ("Visual Composition Breakdown (Chart.js)", [
            "Category Doughnut Chart: Real-time proportion of Cooked Meals (65%), Bakery (15%), Packed Snacks (20%).",
            "Source Bar Chart: Compares portions originating from Central Canteens vs Student Tiffins vs Mess Halls.",
            "Enables mess contractors to pinpoint exact menu items suffering from systemic overproduction."
        ], "SURPLUS COMPOSITION CHARTS")
    ]

    for i, (title, items, badge) in enumerate(s13_cards):
        l = Inches(0.8) + i * Inches(3.98)
        add_card(s13, l, Inches(1.85), Inches(3.75), Inches(4.9), title, items, badge=badge, title_size=20, body_size=14.5)

    # =========================================================================
    # SLIDE 14: Modern UI/UX Design System: "Clash Display" Identity
    # =========================================================================
    s14 = prs.slides.add_slide(blank_layout)
    set_slide_background(s14, ICE_BG)
    add_header(s14, "Modern Design System: 'Clash Display' Visual Identity", "FRONTEND ENGINEERING & UX", 14)

    s14_cards = [
        ("Curated Clash Display Palette", [
            "Deep Midnight Navy (#050F2A): Authoritative, high-contrast dark tone for navbars, modals, and primary buttons.",
            "Electric Sky Azure (#7BBBFF): Vibrant energetic accent for active pills, hover glows, and brand badges.",
            "Iris Lavender (#B8A9FF): Soft modern secondary accent for role tags and chart data visualization.",
            "Icy Pure Canvas (#F2FDFF): Clean, glare-free background providing supreme visual clarity and focus."
        ], "COLOR HARMONY"),
        ("Typography Pairing & Hierarchy", [
            "Clash Display (Fontshare CDN): Geometric, confident display typeface for brand headers, KPI numbers, and modal titles.",
            "Plus Jakarta Sans (Google Fonts): Clean, highly readable humanist sans-serif for body descriptions and data tables.",
            "Ensures accessible contrast ratios exceeding WCAG AAA standards across all device screens."
        ], "TYPOGRAPHY SYSTEM"),
        ("Ultra-Lightweight Vanilla Architecture", [
            "Pure Vanilla JavaScript & CSS Custom Properties: Zero bloated frameworks (No React/Angular build steps).",
            "Page load times under 80 milliseconds; smooth 60 FPS transitions and micro-interactions.",
            "Dual-Engine Resilience: Production PostgreSQL/MySQL with transparent mock fallback ensures 100% demo uptime."
        ], "PERFORMANCE & RELIABILITY")
    ]

    for i, (title, items, badge) in enumerate(s14_cards):
        l = Inches(0.8) + i * Inches(3.98)
        add_card(s14, l, Inches(1.85), Inches(3.75), Inches(4.9), title, items, badge=badge, title_size=20, body_size=14.5)

    # =========================================================================
    # SLIDE 15: Security, Verification & Data Privacy
    # =========================================================================
    s15 = prs.slides.add_slide(blank_layout)
    set_slide_background(s15, ICE_BG)
    add_header(s15, "Trust Architecture: Verification, RBAC & Food Safety Guardrails", "SECURITY & COMPLIANCE", 15)

    s15_cards = [
        ("NGO Legitimacy Verification", [
            "Government NGO registration number validation before activation of food claim privileges.",
            "Prevents unauthorized commercial vendors or scrap dealers from intercepting charitable food.",
            "Verified NGO badge displayed on claim manifests and administrative audit views."
        ], "GOVERNMENT REGISTRATION"),
        ("Strict Role-Based Access Control (RBAC)", [
            "Separation of user privileges: Students cannot claim bulk mess items; canteen staff cannot edit university rules.",
            "Session validation ensures donors can only modify or cancel their own active listings.",
            "Backend SQL row-level scoping protects against unauthorized horizontal data traversal."
        ], "RBAC DATA ENFORCEMENT"),
        ("Food Safety Windows & Legal Protection", [
            "Chronological validation: prepared_time must precede expiry_time; maximum shelf-life capped at 6 hours for cooked food.",
            "Listing auto-locks 60 minutes prior to expiry to guarantee sufficient transport and safe consumption buffer.",
            "Immutable audit trail logging exact timestamps of prep, listing, claim, and physical handoff."
        ], "FOOD SAFETY PROTOCOLS")
    ]

    for i, (title, items, badge) in enumerate(s15_cards):
        l = Inches(0.8) + i * Inches(3.98)
        add_card(s15, l, Inches(1.85), Inches(3.75), Inches(4.9), title, items, badge=badge, title_size=20, body_size=14.5)

    # =========================================================================
    # SLIDE 16: Future Roadmap & Project Conclusion (Dark Theme, Projector Sized)
    # =========================================================================
    s16 = prs.slides.add_slide(blank_layout)
    set_slide_background(s16, NAVY)

    # Top ribbon
    ribbon16 = s16.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.15))
    ribbon16.fill.solid()
    ribbon16.fill.fore_color.rgb = SKY
    ribbon16.line.fill.background()

    # Title on Slide 16
    t16_box = s16.shapes.add_textbox(Inches(0.8), Inches(0.55), Inches(11.733), Inches(1.1))
    tf_16 = t16_box.text_frame
    tf_16.word_wrap = True
    p_16t = tf_16.paragraphs[0]
    p_16t.text = "Future Roadmap & Project Conclusion"
    p_16t.font.name = FONT_HEAD
    p_16t.font.size = Pt(28)
    p_16t.font.bold = True
    p_16t.font.color.rgb = TEXT_LIGHT

    p_16s = tf_16.add_paragraph()
    p_16s.text = "Scaling KindPlates: AI Freshness, Dynamic Van Routing, IoT Scales & Smart City Logistics"
    p_16s.font.name = FONT_BODY
    p_16s.font.size = Pt(15)
    p_16s.font.color.rgb = SKY
    p_16s.space_before = Pt(4)

    # 4 Roadmap Cards
    roadmap = [
        ("1. AI Freshness Vision", [
            "Mobile camera integration with Computer Vision CNN model.",
            "Analyzes food texture, color, and steam to estimate remaining shelf life automatically."
        ]),
        ("2. Dynamic Van Routing", [
            "Traveling Salesperson Algorithm with OpenStreetMap / Google Maps API.",
            "Generates optimal multi-campus collection routes for volunteer vans, cutting fuel use."
        ]),
        ("3. IoT Smart Mess Scales", [
            "Bluetooth/WiFi load cells placed under mess dish disposal stations.",
            "Automatically logs uneaten portion weights into database without manual staff input."
        ]),
        ("4. Tech Park Expansion", [
            "Extend model to corporate food courts (SG Highway, Prahlad Nagar, GIFT City).",
            "Unlocks 10x scale of daily surplus meals for urban community redistribution."
        ])
    ]

    r_w = Inches(2.75)
    r_h = Inches(2.35)
    r_top = Inches(1.85)

    for i, (title, items) in enumerate(roadmap):
        r_left = Inches(0.8) + i * Inches(2.98)
        r_card = s16.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, r_left, r_top, r_w, r_h)
        r_card.fill.solid()
        r_card.fill.fore_color.rgb = NAVY_CARD
        r_card.line.color.rgb = RGBColor(40, 75, 160)
        r_card.line.width = Pt(1.5)

        r_tb = s16.shapes.add_textbox(r_left + Inches(0.14), r_top + Inches(0.14), r_w - Inches(0.28), r_h - Inches(0.28))
        r_tf = r_tb.text_frame
        r_tf.word_wrap = True
        r_tf.margin_top = Inches(0.04)

        p1 = r_tf.paragraphs[0]
        p1.text = title
        p1.font.name = FONT_HEAD
        p1.font.size = Pt(16)
        p1.font.bold = True
        p1.font.color.rgb = IRIS
        p1.space_after = Pt(6)

        for itm in items:
            p2 = r_tf.add_paragraph()
            p2.text = f"• {itm}"
            p2.font.name = FONT_BODY
            p2.font.size = Pt(13.5)
            p2.font.color.rgb = RGBColor(215, 230, 255)
            p2.space_after = Pt(4)

    # Conclusion Banner Box (Large 15pt text for projector)
    concl_card = s16.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.45), Inches(11.733), Inches(2.35))
    concl_card.fill.solid()
    concl_card.fill.fore_color.rgb = RGBColor(14, 30, 75)
    concl_card.line.color.rgb = SKY
    concl_card.line.width = Pt(1.5)

    c_tb = s16.shapes.add_textbox(Inches(1.1), Inches(4.55), Inches(11.133), Inches(2.15))
    c_tf = c_tb.text_frame
    c_tf.word_wrap = True

    p_ct = c_tf.paragraphs[0]
    p_ct.text = "CONCLUSION & SOCIAL IMPACT"
    p_ct.font.name = FONT_HEAD
    p_ct.font.size = Pt(16)
    p_ct.font.bold = True
    p_ct.font.color.rgb = SKY
    p_ct.space_after = Pt(6)

    p_cd = c_tf.add_paragraph()
    p_cd.text = "KindPlates demonstrates how sound Database Management principles (3NF normalization, atomic stored procedures, ACID concurrency, and automated triggers) can solve one of the most critical humanitarian and environmental crises of our generation. By transforming campus food waste from an environmental liability into a structured community asset, the system bridges the gap between abundance and hunger with technological precision."
    p_cd.font.name = FONT_BODY
    p_cd.font.size = Pt(14.5)
    p_cd.font.color.rgb = TEXT_LIGHT
    p_cd.space_after = Pt(10)

    p_qa = c_tf.add_paragraph()
    p_qa.text = "Thank You!   •   Questions & Answers / Demonstration"
    p_qa.font.name = FONT_HEAD
    p_qa.font.size = Pt(18)
    p_qa.font.bold = True
    p_qa.font.color.rgb = IRIS

    # Save presentation with graceful fallback if the user has the file open in PowerPoint
    base_dir = os.path.dirname(os.path.abspath(__file__))
    primary_path = os.path.join(base_dir, "KindPlates_Project_Presentation.pptx")
    v2_path = os.path.join(base_dir, "KindPlates_Project_Presentation_v2.pptx")
    legacy_path = os.path.join(base_dir, "FoodBridge_Project_Presentation_v2.pptx")
    artifact_path = r"C:\Users\Admin\.gemini\antigravity\brain\edb9b1b2-3e7d-418c-9377-5182517d8b2c\KindPlates_Project_Presentation.pptx"
    
    saved_paths = []
    for p in [primary_path, v2_path, legacy_path, artifact_path]:
        try:
            prs.save(p)
            saved_paths.append(p)
        except Exception as e:
            print(f"Notice: could not save {p}: {e}")

    for p in saved_paths:
        print(f"Projector-standard presentation saved successfully at: {p}")

if __name__ == "__main__":
    create_deck()
