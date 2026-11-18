// Auto-detect API base URL (handles http://127.0.0.1:8000, VS Code Live Server port 5500, and direct file:/// opening)
const API_BASE = (window.location.port === "8000")
    ? ""
    : "http://127.0.0.1:8000";

let currentNgo = null;
let rawListings = [];
let notifDrawerOpen = false;
let cachedPendingClaims = [];
let cachedCompletedClaims = [];
let pendingNgoClaimActionId = null;

document.addEventListener("DOMContentLoaded", () => {
    initNgoSession();
    loadAvailableFood();
    loadNgoPickups();
    loadNotifications();

    // Check if URL specifies analytics tab
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("tab") === "analytics" || window.location.hash === "#analytics") {
        switchNgoTab("analytics");
    }

    // Periodically poll for notifications
    setInterval(loadNotifications, 15000);

    // Keyboard Escape to close modals
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeClaimModal();
            closeClaimSuccessModal();
            closeCancelClaimModal();
            closeMarkCollectedModal();
            closeDeclineModal();
        }
    });

    // Close when clicking overlay background
    ["claimModal", "claimSuccessModal", "cancelClaimModal", "markCollectedModal", "declineConfirmModal"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("click", (e) => {
                if (e.target === el) {
                    el.classList.remove("active");
                }
            });
        }
    });
});

function initNgoSession() {
    const raw = localStorage.getItem("biteshare_user") || localStorage.getItem("kindplates_user") || localStorage.getItem("foodbridge_user");
    if (raw) {
        try {
            const user = JSON.parse(raw);
            if (user.role === "ngo") {
                currentNgo = user;
            }
        } catch (e) {
            console.error("Session parse error", e);
        }
    }

    // Default mock NGO if none logged in
    if (!currentNgo) {
        currentNgo = {
            ngo_id: 1,
            role: "ngo",
            name: "Robin Hood Army Ahmedabad",
            address: "SG Highway Distribution Hub, Bodakdev",
            city: "Ahmedabad",
            pincode: "380054",
            email: "ahmedabad@robinhoodarmy.com"
        };
    }

    document.getElementById("ngoNameDisplay").textContent = currentNgo.name;
    const ngoLoc = currentNgo.address 
        ? `${currentNgo.address}, ${currentNgo.city || "Ahmedabad"}` 
        : (currentNgo.city || "Ahmedabad");
    document.getElementById("ngoCityDisplay").textContent = `📍 ${ngoLoc}`;
    document.getElementById("ngoCityDisplay").title = currentNgo.address ? `${currentNgo.address}, ${currentNgo.city} - ${currentNgo.pincode || ''}` : ngoLoc;
    document.getElementById("avatarInitial").textContent = currentNgo.name.charAt(0).toUpperCase();
}

// Switch between Feed, Pending Pickups, Completed Rescues, and Impact & Analytics tabs
function switchNgoTab(tab) {
    const isFeed = tab === "feed";
    const isPending = tab === "pending";
    const isCompleted = tab === "completed";
    const isAnalytics = tab === "analytics";

    document.getElementById("tabFeed").classList.toggle("active", isFeed);
    document.getElementById("tabPending").classList.toggle("active", isPending);
    document.getElementById("tabCompleted").classList.toggle("active", isCompleted);
    document.getElementById("tabAnalytics").classList.toggle("active", isAnalytics);

    document.getElementById("sectionFeed").style.display = isFeed ? "block" : "none";
    document.getElementById("filterBar").style.display = isFeed ? "flex" : "none";
    document.getElementById("sectionPending").style.display = isPending ? "block" : "none";
    document.getElementById("sectionCompleted").style.display = isCompleted ? "block" : "none";
    document.getElementById("sectionAnalytics").style.display = isAnalytics ? "block" : "none";

    if (isAnalytics) {
        loadAnalyticsTab();
    } else if (isPending || isCompleted) {
        loadNgoPickups();
    } else {
        loadAvailableFood();
    }
}

// Fetch available food listings (Single operating city network)
async function loadAvailableFood() {
    const cardsGrid = document.getElementById("cardsGrid");
    const ngoId = currentNgo ? (currentNgo.ngo_id || 1) : 1;

    try {
        const res = await fetch(`${API_BASE}/api/ngo/listings?ngo_id=${ngoId}`);
        if (res.ok) {
            const listings = await res.json();
            // Filter out any locally saved declined IDs as well (double protection)
            const declinedIds = getDeclinedListingIds(ngoId);
            rawListings = listings.filter(l => !declinedIds.includes(l.listing_id));
            populateCampusFilter(rawListings);
            filterListings();
        } else {
            cardsGrid.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8; grid-column:1/-1;">Could not load listings.</div>`;
        }
    } catch (err) {
        cardsGrid.innerHTML = `
            <div style="text-align:center; padding:40px; color:#94a3b8; grid-column:1/-1;">
                <i class="fa-solid fa-cloud-slash" style="font-size: 2rem; margin-bottom: 10px; color: #cbd5e1; display: block;"></i>
                <div>Unable to load listings.</div>
                <button onclick="loadAvailableFood()" class="btn-primary" style="margin-top: 12px; padding: 6px 14px; font-size: 0.85rem; border-radius: 6px; cursor: pointer;">
                    <i class="fa-solid fa-arrows-rotate"></i> Retry
                </button>
            </div>
        `;
    }
}

function populateCampusFilter(listings) {
    const select = document.getElementById("campusFilter");
    if (!select) return;
    const currentVal = select.value;
    const campuses = new Set();
    listings.forEach(l => {
        if (l.university_name) campuses.add(l.university_name);
    });

    let opts = `<option value="all" ${currentVal === "all" ? "selected" : ""}>All Campuses (Ahmedabad Citywide)</option>`;
    campuses.forEach(name => {
        opts += `<option value="${escapeHtml(name)}" ${currentVal === name ? "selected" : ""}>${escapeHtml(name)}</option>`;
    });
    select.innerHTML = opts;
}

function filterListings() {
    const category = document.getElementById("categoryFilter") ? document.getElementById("categoryFilter").value : "all";
    const campus = document.getElementById("campusFilter") ? document.getElementById("campusFilter").value : "all";
    const cardsGrid = document.getElementById("cardsGrid");

    let filtered = rawListings;
    if (category !== "all") {
        filtered = filtered.filter(item => item.food_category === category);
    }
    if (campus !== "all") {
        filtered = filtered.filter(item => item.university_name === campus);
    }

    document.getElementById("activeCountDisplay").textContent = `${filtered.length} surplus dishes available`;

    if (filtered.length === 0) {
        cardsGrid.innerHTML = `
            <div style="text-align:center; padding:50px 20px; color:#94a3b8; grid-column:1/-1;">
                <i class="fa-solid fa-plate-wheat" style="font-size:2.5rem; margin-bottom:12px; color:#cbd5e1;"></i>
                <h4 style="color:#475569; font-size:1.1rem; margin-bottom:6px;">No Active Food Listings Found</h4>
                <p style="font-size:0.85rem;">Check back shortly for newly reported surplus food from college canteens and student messes across Ahmedabad.</p>
            </div>
        `;
        return;
    }

    cardsGrid.innerHTML = filtered.map(item => {
        const remainingHours = calculateHoursLeft(item.expiry_time);
        const isCanteen = item.food_source === "canteen" || item.food_source === "hostel_mess";
        const qtyLabel = isCanteen ? `Quantity: <strong>${item.quantity_servings} kg</strong>` : `Portions: <strong>${item.quantity_servings} people</strong>`;
        const qtyIcon = isCanteen ? "fa-solid fa-weight-hanging" : "fa-solid fa-users";
        const campusAddressFull = item.university_address 
            ? `${item.university_address}, ${item.city || 'Ahmedabad'}${item.university_pincode ? ' - ' + item.university_pincode : ''}` 
            : (item.city || 'Ahmedabad');

        return `
            <div class="food-card" id="card-${item.listing_id}">
                <div>
                    <div class="food-card-header">
                        <span class="univ-pill" title="${escapeHtml(campusAddressFull)}">
                            <i class="fa-solid fa-building-columns"></i> ${escapeHtml(item.university_name || "Campus")}
                        </span>
                        <span class="expiry-countdown">
                            <i class="fa-regular fa-clock"></i> Expires: ${remainingHours}
                        </span>
                    </div>

                    <h3 class="food-title">${escapeHtml(item.food_title)}</h3>
                    <p class="food-desc">${escapeHtml(item.description || "Prepared hygienically on campus.")}</p>

                    <div class="food-meta">
                        <div class="meta-item">
                            <i class="${qtyIcon}" style="color:var(--ngo-primary);"></i>
                            <span>${qtyLabel}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fa-solid fa-location-dot" style="color:#ef4444;"></i>
                            <span>Pickup: <strong>${escapeHtml(item.pickup_location || "Campus Main Gate")}</strong></span>
                        </div>
                        <div class="meta-item" style="grid-column: 1 / -1;">
                            <i class="fa-solid fa-map-location-dot" style="color:#6366f1;"></i>
                            <span>Campus Address: <strong>${escapeHtml(campusAddressFull)}</strong></span>
                        </div>
                        <div class="meta-item" style="grid-column: 1 / -1;">
                            <i class="fa-solid fa-phone" style="color:#10b981;"></i>
                            <span>Donor Contact: <strong>${escapeHtml(item.donor_phone || "Via campus office")}</strong> (${escapeHtml(item.donor_name || "Campus Donor")})</span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons: Accept / Claim and Decline -->
                <div style="display: flex; gap: 10px; margin-top: 8px;">
                    <button class="btn-claim" style="flex: 2; padding: 10px;" onclick="openClaimModal(${item.listing_id})">
                        <i class="fa-solid fa-circle-check"></i> Accept Food
                    </button>
                    <button 
                        style="flex: 1; padding: 10px; background: #fef2f2; color: #ef4444; border: 1.5px solid #fecaca; border-radius: 10px; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;"
                        onclick="dismissListing(${item.listing_id})"
                        title="Decline this food item"
                    >
                        <i class="fa-solid fa-ban"></i> Decline
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

// Open Claim Food Modal
function openClaimModal(listingId) {
    const item = rawListings.find(l => l.listing_id === listingId);
    if (!item) return;

    document.getElementById("claimListingId").value = item.listing_id;
    
    // Clear any previous error
    const errEl = document.getElementById("claimErrorAlert");
    if (errEl) {
        errEl.textContent = "";
        errEl.style.display = "none";
    }

    // Set ETA to 45 minutes from now
    const now = new Date();
    const etaDate = new Date(now.getTime() + (45 * 60 * 1000));
    const pad = (n) => String(n).padStart(2, '0');
    const etaStr = `${etaDate.getFullYear()}-${pad(etaDate.getMonth()+1)}-${pad(etaDate.getDate())}T${pad(etaDate.getHours())}:${pad(etaDate.getMinutes())}`;
    document.getElementById("expectedPickupTime").value = etaStr;

    const isCanteen = item.food_source === "canteen" || item.food_source === "hostel_mess";
    const unitText = isCanteen ? `${item.quantity_servings} kg` : `${item.quantity_servings} servings (${item.quantity_servings} people)`;
    const campusFullAddr = item.university_address 
        ? `${item.university_address}, ${item.city || "Ahmedabad"}${item.university_pincode ? ' - ' + item.university_pincode : ''}`
        : (item.city || "Ahmedabad");

    // Summary box
    document.getElementById("claimFoodSummary").innerHTML = `
        <strong>${escapeHtml(item.food_title)}</strong> (${unitText})<br>
        <span style="color:#64748b;">University:</span> <strong>${escapeHtml(item.university_name || "Campus")}</strong><br>
        <span style="color:#64748b;">Campus Address:</span> ${escapeHtml(campusFullAddr)}<br>
        <span style="color:#64748b;">Pickup Point:</span> <strong>${escapeHtml(item.pickup_location || "Campus Main Desk")}</strong>
    `;

    document.getElementById("claimModal").classList.add("active");
}

function closeClaimModal() {
    document.getElementById("claimModal").classList.remove("active");
}

// Submit Claim
async function submitClaim(e) {
    e.preventDefault();

    const listingId = parseInt(document.getElementById("claimListingId").value);
    const volunteerName = document.getElementById("volunteerName").value.trim();
    const volunteerPhone = document.getElementById("volunteerPhone").value.trim();
    const pickupTime = document.getElementById("expectedPickupTime").value.replace("T", " ") + ":00";
    const notes = document.getElementById("claimNotes").value.trim();
    const btn = document.getElementById("btnConfirmClaim");
    const errEl = document.getElementById("claimErrorAlert");

    if (errEl) errEl.style.display = "none";

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Reserving Food & Locking Record...`;

    const payload = {
        listing_id: listingId,
        ngo_id: currentNgo.ngo_id || 1,
        volunteer_name: volunteerName,
        volunteer_phone: volunteerPhone,
        expected_pickup_time: pickupTime,
        notes: notes
    };

    try {
        const res = await fetch(`${API_BASE}/api/claims`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeClaimModal();
            showClaimSuccessDialog(listingId, volunteerName, volunteerPhone, pickupTime);
            loadAvailableFood();
            loadNgoPickups();
        } else {
            const err = await res.json();
            const msg = err.detail || "Could not claim listing. This item may have already been claimed by another NGO partner.";
            if (errEl) {
                errEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(msg)}`;
                errEl.style.display = "block";
            }
            loadAvailableFood();
        }
    } catch (err) {
        if (errEl) {
            errEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Server connection failed. Ensure backend is running.`;
            errEl.style.display = "block";
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Confirm Claim & Dispatch Volunteer`;
    }
}

function showClaimSuccessDialog(listingId, volunteerName, volunteerPhone, pickupTime) {
    const item = rawListings.find(l => l.listing_id === listingId);
    const container = document.getElementById("confirmedClaimDetails");
    if (container) {
        const isCanteen = item && (item.food_source === "canteen" || item.food_source === "hostel_mess");
        const qty = item ? (isCanteen ? `${item.quantity_servings} kg` : `${item.quantity_servings} servings`) : "Batch";
        const title = item ? item.food_title : "Food Listing";
        const loc = item ? item.pickup_location : "Campus Main Desk";
        const univ = item ? item.university_name : "Campus";
        const campusAddr = item && item.university_address 
            ? `${item.university_address}, ${item.city || "Ahmedabad"}${item.university_pincode ? ' - ' + item.university_pincode : ''}` 
            : (item ? (item.city || "Ahmedabad") : "Ahmedabad");

        container.innerHTML = `
            <div><strong><i class="fa-solid fa-bowl-rice" style="color:#050F2A;"></i> Dish Rescued:</strong> ${escapeHtml(title)} <span style="background:#EBF5FF; color:#050F2A; padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.75rem; margin-left:6px;">${qty}</span></div>
            <div><strong><i class="fa-solid fa-building-columns" style="color:#050F2A;"></i> University:</strong> ${escapeHtml(univ)}</div>
            <div><strong><i class="fa-solid fa-map-location-dot" style="color:#6366f1;"></i> Campus Address:</strong> ${escapeHtml(campusAddr)}</div>
            <div><strong><i class="fa-solid fa-location-dot" style="color:#ef4444;"></i> Pickup Point:</strong> ${escapeHtml(loc)}</div>
            <div><strong><i class="fa-solid fa-user-check" style="color:#16a34a;"></i> Assigned Volunteer:</strong> ${escapeHtml(volunteerName)} (${escapeHtml(volunteerPhone)})</div>
            <div><strong><i class="fa-regular fa-clock" style="color:#c27803;"></i> Expected Arrival:</strong> ${pickupTime ? formatReadableDate(pickupTime) : "As scheduled"}</div>
        `;
    }
    const modal = document.getElementById("claimSuccessModal");
    if (modal) {
        modal.classList.add("active");
    }
}

function closeClaimSuccessModal() {
    const modal = document.getElementById("claimSuccessModal");
    if (modal) {
        modal.classList.remove("active");
    }
}

function goToPendingFromConfirmation() {
    closeClaimSuccessModal();
    switchNgoTab("pending");
}

// Load Claims & Pickups (Separated into Pending vs Completed)
async function loadNgoPickups() {
    const ngoId = currentNgo.ngo_id || 1;

    try {
        const res = await fetch(`${API_BASE}/api/ngo/claims?ngo_id=${ngoId}`);
        if (res.ok) {
            const claims = await res.json();
            
            // Separate into pending vs completed
            cachedPendingClaims = claims.filter(c => c.claim_status === "active");
            cachedCompletedClaims = claims.filter(c => c.claim_status === "completed");

            // Update badge counters
            const pendingBadge = document.getElementById("pendingCountBadge");
            const completedBadge = document.getElementById("completedCountBadge");
            const pendingSubCount = document.getElementById("pendingSubCount");
            const completedSubCount = document.getElementById("completedSubCount");

            if (pendingBadge) pendingBadge.textContent = cachedPendingClaims.length;
            if (completedBadge) completedBadge.textContent = cachedCompletedClaims.length;
            if (pendingSubCount) pendingSubCount.textContent = cachedPendingClaims.length;
            if (completedSubCount) completedSubCount.textContent = cachedCompletedClaims.length;

            renderPendingPickups(cachedPendingClaims);
            renderCompletedPickups(cachedCompletedClaims);
        } else {
            console.error("Failed to load claims");
        }
    } catch (err) {
        console.error("Server connection failed for claims", err);
    }
}

// Render Pending Pickups (Accepted, Awaiting Collection)
function renderPendingPickups(claims) {
    const grid = document.getElementById("pendingGrid");
    if (!grid) return;

    if (!claims || claims.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center; padding:50px 20px; color:#64748B; grid-column:1/-1;">
                <i class="fa-solid fa-clock-rotate-left" style="font-size:2.5rem; margin-bottom:12px; color:#7BBBFF;"></i>
                <h4 style="color:#050F2A; font-family:'Clash Display','Plus Jakarta Sans',sans-serif; font-size:1.1rem; margin-bottom:6px;">No Pending Pickups</h4>
                <p style="font-size:0.85rem;">Browse the Available Surplus Food tab to accept and claim meals for redistribution.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = claims.map(c => {
        const isCanteen = c.food_source === "canteen" || c.food_source === "hostel_mess" || (c.pickup_location && c.pickup_location.toLowerCase().includes("canteen"));
        const qtyDisplay = isCanteen ? `${c.quantity_servings} kg` : `${c.quantity_servings} servings`;
        const qtyIcon = isCanteen ? "fa-solid fa-weight-hanging" : "fa-solid fa-users";

        return `
            <div class="food-card" style="border-left: 4px solid #C27803;">
                <div>
                    <div class="food-card-header">
                        <span class="univ-pill">${escapeHtml(c.university_name || "Campus")}</span>
                        <span style="background:#FEF3C7; color:#854D0E; padding:4px 8px; border-radius:999px; font-size:0.75rem; font-weight:700;">
                            <i class="fa-solid fa-truck-fast"></i> In-Transit &bull; Pending
                        </span>
                    </div>

                    <h3 class="food-title">${escapeHtml(c.food_title)}</h3>
                    
                    <div class="food-meta">
                        <div class="meta-item">
                            <i class="${qtyIcon}" style="color:var(--ngo-primary);"></i>
                            <span>Quantity: <strong>${qtyDisplay}</strong></span>
                        </div>
                        <div class="meta-item">
                            <i class="fa-solid fa-clock" style="color:#C27803;"></i>
                            <span>ETA: <strong>${escapeHtml(c.expected_pickup_time || "Pending")}</strong></span>
                        </div>
                        <div class="meta-item" style="grid-column: 1 / -1;">
                            <i class="fa-solid fa-person-walking-luggage" style="color:var(--ngo-primary);"></i>
                            <span>Volunteer: <strong>${escapeHtml(c.volunteer_name || "Assigned")}</strong> (${escapeHtml(c.volunteer_phone || "N/A")})</span>
                        </div>
                        <div class="meta-item" style="grid-column: 1 / -1;">
                            <i class="fa-solid fa-location-dot" style="color:#ef4444;"></i>
                            <span>Pickup Point: <strong>${escapeHtml(c.pickup_location || "Campus Main Desk")}</strong></span>
                        </div>
                        <div class="meta-item" style="grid-column: 1 / -1;">
                            <i class="fa-solid fa-map-location-dot" style="color:#6366f1;"></i>
                            <span>Campus Address: ${escapeHtml(c.university_address ? c.university_address + ', ' + (c.university_city || 'Ahmedabad') + (c.university_pincode ? ' - ' + c.university_pincode : '') : (c.university_city || 'Ahmedabad'))}</span>
                        </div>
                        <div class="meta-item" style="grid-column: 1 / -1;">
                            <i class="fa-solid fa-phone" style="color:#2E7D32;"></i>
                            <span>Donor Contact: <strong>${escapeHtml(c.donor_phone || "Campus Desk")}</strong> (${escapeHtml(c.donor_name || "Donor")})</span>
                        </div>
                    </div>
                </div>

                <div>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button class="btn-claim" style="flex: 2; padding: 10px;" onclick="markCollected(${c.claim_id})">
                            <i class="fa-solid fa-box-check"></i> Mark Food Collected
                        </button>
                        <button 
                            style="flex: 1; padding: 10px; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 10px; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
                            onclick="cancelClaim(${c.claim_id})"
                            title="Cancel this pickup and release food back to feed"
                        >
                            <i class="fa-solid fa-xmark"></i> Cancel Claim
                        </button>
                    </div>

                    <button class="btn-pdf-item" onclick="downloadSinglePassPdf(${c.claim_id}, 'pending')">
                        <i class="fa-solid fa-file-pdf"></i> Download Campus Gate Pass (PDF)
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

// Render Completed Rescues (Accepted & Picked Up)
function renderCompletedPickups(claims) {
    const grid = document.getElementById("completedGrid");
    if (!grid) return;

    if (!claims || claims.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center; padding:50px 20px; color:#64748B; grid-column:1/-1;">
                <i class="fa-solid fa-circle-check" style="font-size:2.5rem; margin-bottom:12px; color:#7BBBFF;"></i>
                <h4 style="color:#050F2A; font-family:'Clash Display','Plus Jakarta Sans',sans-serif; font-size:1.1rem; margin-bottom:6px;">No Completed Rescues Yet</h4>
                <p style="font-size:0.85rem;">When your volunteers pick up food shipments and mark them collected, they will appear here.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = claims.map(c => {
        const isCanteen = c.food_source === "canteen" || c.food_source === "hostel_mess" || (c.pickup_location && c.pickup_location.toLowerCase().includes("canteen"));
        const qtyDisplay = isCanteen ? `${c.quantity_servings} kg` : `${c.quantity_servings} servings`;
        const qtyIcon = isCanteen ? "fa-solid fa-weight-hanging" : "fa-solid fa-users";

        return `
            <div class="food-card" style="border-left: 4px solid #050F2A;">
                <div>
                    <div class="food-card-header">
                        <span class="univ-pill">${escapeHtml(c.university_name || "Campus")}</span>
                        <span style="background:#EBF5FF; color:#050F2A; padding:4px 8px; border-radius:999px; font-size:0.75rem; font-weight:700; border:1px solid #D3E4F8;">
                            <i class="fa-solid fa-check" style="color:#7BBBFF;"></i> Rescued &amp; Delivered
                        </span>
                    </div>

                    <h3 class="food-title">${escapeHtml(c.food_title)}</h3>
                    
                    <div class="food-meta">
                        <div class="meta-item">
                            <i class="${qtyIcon}" style="color:var(--ngo-primary);"></i>
                            <span>Rescued: <strong>${qtyDisplay}</strong></span>
                        </div>
                        <div class="meta-item">
                            <i class="fa-solid fa-calendar-check" style="color:#050F2A;"></i>
                            <span>Collected: <strong>${escapeHtml(c.actual_pickup_time || c.expected_pickup_time || "Recorded")}</strong></span>
                        </div>
                        <div class="meta-item" style="grid-column: 1 / -1;">
                            <i class="fa-solid fa-person-walking-luggage" style="color:var(--ngo-primary);"></i>
                            <span>Handled by: <strong>${escapeHtml(c.volunteer_name || "Volunteer")}</strong></span>
                        </div>
                        <div class="meta-item" style="grid-column: 1 / -1;">
                            <i class="fa-solid fa-location-dot" style="color:#ef4444;"></i>
                            <span>Pickup Point: <strong>${escapeHtml(c.pickup_location || "Campus Main Desk")}</strong></span>
                        </div>
                        <div class="meta-item" style="grid-column: 1 / -1;">
                            <i class="fa-solid fa-map-location-dot" style="color:#6366f1;"></i>
                            <span>Campus Address: ${escapeHtml(c.university_address ? c.university_address + ', ' + (c.university_city || 'Ahmedabad') + (c.university_pincode ? ' - ' + c.university_pincode : '') : (c.university_city || 'Ahmedabad'))}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <div style="text-align:center; font-size:0.85rem; color:#050F2A; font-weight:600; padding:8px 0; background:#EBF5FF; border:1px solid #D3E4F8; border-radius:var(--radius-md);">
                        <i class="fa-solid fa-heart" style="color:#7BBBFF;"></i> Food diverted from landfill &amp; distributed successfully.
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// -----------------------------------------------------------------------------
// PDF GENERATION MODULE (Using jsPDF & AutoTable)
// -----------------------------------------------------------------------------

// Download full manifest / report PDF for either pending or completed tab
function downloadManifestPdf(type) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("PDF generator library is loading, please try again in a moment.", "info");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const isPending = type === 'pending';
    const list = isPending ? cachedPendingClaims : cachedCompletedClaims;

    if (!list || list.length === 0) {
        showToast(`No ${isPending ? 'pending pickups' : 'completed rescues'} to export.`, "info");
        return;
    }

    // Top Header Banner
    doc.setFillColor(5, 15, 42); // #050F2A
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(242, 253, 255); // #F2FDFF
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("BITESHARE | INTER-UNIVERSITY FOOD RESCUE", 14, 14);

    doc.setTextColor(184, 169, 255); // #B8A9FF
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const subTitle = isPending 
        ? "OFFICIAL VOLUNTEER PICKUP MANIFEST & DISPATCH LOG" 
        : "OFFICIAL FOOD RESCUE LEDGER & DONATION CERTIFICATE";
    doc.text(subTitle, 14, 23);

    // Organization Metadata Card
    doc.setTextColor(5, 15, 42);
    doc.setFontSize(10);
    doc.text(`NGO Partner: ${currentNgo ? currentNgo.name : "Robin Hood Army Ahmedabad"}`, 14, 42);
    const ngoFullAddr = (currentNgo && currentNgo.address) ? `${currentNgo.address}, ${currentNgo.city || 'Ahmedabad'}` : (currentNgo ? currentNgo.city : "Bodakdev, Ahmedabad");
    doc.text(`NGO Dispatch Hub: ${ngoFullAddr}`, 14, 48);
    doc.text(`Report Type: ${isPending ? "Pending Collections" : "Completed Rescues"}`, 14, 54);

    doc.text(`Generated On: ${new Date().toLocaleString()}`, 125, 42);
    doc.text(`Total Records: ${list.length} food items`, 125, 48);
    doc.text(`Status: ${isPending ? "ACTIVE DISPATCH" : "OFFICIALLY VERIFIED"}`, 125, 54);

    // Table Data
    const tableData = list.map((item, index) => {
        const isCanteen = item.food_source === "canteen" || item.food_source === "hostel_mess" || (item.pickup_location && item.pickup_location.toLowerCase().includes("canteen"));
        const qty = isCanteen ? `${item.quantity_servings} kg` : `${item.quantity_servings} servings`;
        const timeVal = isPending 
            ? (item.expected_pickup_time || "Pending") 
            : (item.actual_pickup_time || item.expected_pickup_time || "Recorded");
        const univDisplay = item.university_address 
            ? `${item.university_name || 'Campus'}\n(${item.university_address})` 
            : (item.university_name || "Campus");

        return [
            index + 1,
            item.food_title,
            univDisplay,
            qty,
            item.pickup_location || "Campus Main Desk",
            `${item.volunteer_name || "Volunteer"} (${item.volunteer_phone || "N/A"})`,
            timeVal
        ];
    });

    doc.autoTable({
        startY: 60,
        head: [['#', 'Food Item', 'University Campus', 'Quantity', 'Pickup Spot', 'Volunteer Assigned', isPending ? 'ETA Arrival' : 'Rescued At']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [5, 15, 42],
            textColor: [242, 253, 255],
            fontStyle: 'bold',
            fontSize: 9
        },
        styles: {
            fontSize: 8,
            cellPadding: 3.5,
            textColor: [5, 15, 42]
        },
        alternateRowStyles: {
            fillColor: [242, 253, 255]
        }
    });

    const finalY = doc.lastAutoTable.finalY || 180;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Official document generated by BiteShare Inter-University Waste Management System.", 14, finalY + 12);
    doc.text("Authorized by university administration & verified NGO partners under the Zero Food Waste Initiative.", 14, finalY + 17);

    doc.save(`BiteShare_${isPending ? 'Pending_Pickups_Manifest' : 'Completed_Rescue_Report'}_${Date.now()}.pdf`);
}

// Download single item gate pass / donation certificate PDF
function downloadSinglePassPdf(claimId, type) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("PDF generator library is loading, please try again.", "info");
        return;
    }

    const isPending = type === 'pending';
    const list = isPending ? cachedPendingClaims : cachedCompletedClaims;
    const item = list.find(c => c.claim_id === claimId);
    if (!item) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a5'); // A5 size is perfect for gate passes/receipts

    const isCanteen = item.food_source === "canteen" || item.food_source === "hostel_mess" || (item.pickup_location && item.pickup_location.toLowerCase().includes("canteen"));
    const qty = isCanteen ? `${item.quantity_servings} kg` : `${item.quantity_servings} servings`;

    // Header Box
    doc.setFillColor(5, 15, 42); // #050F2A
    doc.rect(0, 0, 148, 28, 'F');

    doc.setTextColor(242, 253, 255); // #F2FDFF
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("BITESHARE &bull; OFFICIAL VOUCHER", 10, 12);

    doc.setTextColor(184, 169, 255); // #B8A9FF
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const docTitle = isPending ? "CAMPUS GATE PASS & PICKUP AUTHORIZATION" : "OFFICIAL SURPLUS FOOD RESCUE RECEIPT";
    doc.text(docTitle, 10, 20);

    // Pass ID Banner
    doc.setFillColor(235, 245, 255); // soft ice blue
    doc.rect(10, 33, 128, 10, 'F');
    doc.setTextColor(5, 15, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`PASS ID: BS-CLAIM-${item.claim_id}  |  STATUS: ${isPending ? 'AUTHORIZED FOR COLLECTION' : 'OFFICIALLY RESCUED'}`, 13, 39);

    // Details Grid
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(5, 15, 42);
    
    let y = 49;
    const addRow = (label, val) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 12, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(val || "N/A"), 55, y);
        y += 6.5;
    };

    const univAddr = item.university_address 
        ? `${item.university_address}, ${item.university_city || 'Ahmedabad'}${item.university_pincode ? ' - ' + item.university_pincode : ''}` 
        : (item.university_city || 'Ahmedabad');
    const ngoAddr = (currentNgo && currentNgo.address) 
        ? `${currentNgo.address}, ${currentNgo.city || 'Ahmedabad'}` 
        : (item.ngo_address ? `${item.ngo_address}, ${item.ngo_city || 'Ahmedabad'}` : (currentNgo ? currentNgo.city : 'Ahmedabad'));

    addRow("Food Item:", item.food_title);
    addRow("Quantity Rescued:", qty);
    addRow("University Campus:", item.university_name || "Campus");
    addRow("Campus Address:", univAddr);
    addRow("Pickup Point:", item.pickup_location || "Campus Main Desk");
    addRow("Donor Contact:", `${item.donor_name || "Campus Donor"} (${item.donor_phone || "N/A"})`);
    addRow("Authorized NGO:", currentNgo ? currentNgo.name : "Robin Hood Army Ahmedabad");
    addRow("NGO Dispatch Hub:", ngoAddr);
    addRow("Assigned Volunteer:", `${item.volunteer_name || "Volunteer"} (${item.volunteer_phone || "N/A"})`);
    addRow(isPending ? "Expected Arrival:" : "Completed At:", isPending ? (item.expected_pickup_time || "Pending") : (item.actual_pickup_time || "Completed"));

    // Footer Box
    doc.setDrawColor(211, 228, 248);
    doc.line(10, y + 5, 138, y + 5);

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Instructions for Campus Security & Mess Incharge:", 10, y + 12);
    doc.text("1. Permit the volunteer vehicle for immediate loading of designated food containers.", 10, y + 17);
    doc.text("2. Validate volunteer identification number against the contact listed above.", 10, y + 21);

    doc.save(`BiteShare_${isPending ? 'GatePass' : 'Receipt'}_#${item.claim_id}.pdf`);
}

let pendingDeclineListingId = null;

// Open custom confirmation dialog to decline a listing
function dismissListing(listingId) {
    pendingDeclineListingId = listingId;
    const item = rawListings.find(l => l.listing_id === listingId);
    const titleEl = document.getElementById("declineItemTitle");
    const subEl = document.getElementById("declineItemSub");

    if (item) {
        if (titleEl) titleEl.textContent = item.food_title || "Food Listing";
        if (subEl) {
            const isCanteen = item.food_source === "canteen" || item.food_source === "hostel_mess";
            const qty = isCanteen ? `${item.quantity_servings} kg` : `${item.quantity_servings} servings`;
            subEl.textContent = `${qty} • ${item.university_name || "Campus"} • ${item.pickup_location || ""}`;
        }
    } else {
        if (titleEl) titleEl.textContent = `Listing #${listingId}`;
        if (subEl) subEl.textContent = "";
    }

    const modal = document.getElementById("declineConfirmModal");
    if (modal) modal.classList.add("active");
}

function closeDeclineModal() {
    pendingDeclineListingId = null;
    const modal = document.getElementById("declineConfirmModal");
    if (modal) modal.classList.remove("active");
}

async function executeDeclineListing() {
    if (!pendingDeclineListingId) return;
    const listingId = pendingDeclineListingId;
    const ngoId = currentNgo ? (currentNgo.ngo_id || 1) : 1;
    const btn = document.getElementById("btnConfirmDecline");

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Declining...`;
    }

    // 1. Record decline locally in localStorage so it never re-appears across refreshes or tab switches
    addDeclinedListingId(ngoId, listingId);

    // 2. Call backend decline API endpoint to persist in database
    try {
        await fetch(`${API_BASE}/api/ngo/listings/${listingId}/decline?ngo_id=${ngoId}`, {
            method: "POST"
        });
    } catch (e) {
        console.warn("Backend decline API call failed, saved locally", e);
    }

    // 3. Remove card from DOM and rawListings
    const card = document.getElementById(`card-${listingId}`);
    if (card) {
        card.style.transition = "all 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";
    }

    setTimeout(() => {
        rawListings = rawListings.filter(l => l.listing_id !== listingId);
        filterListings();
        closeDeclineModal();
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-ban"></i> Yes, Decline`;
        }
        showToast("Food offer declined and removed from your surplus feed.", "info");
    }, 250);
}

function getDeclinedListingIds(ngoId) {
    try {
        const raw = localStorage.getItem(`biteshare_declined_ngo_${ngoId}`) || localStorage.getItem(`kindplates_declined_ngo_${ngoId}`) || localStorage.getItem(`foodbridge_declined_ngo_${ngoId}`);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function addDeclinedListingId(ngoId, listingId) {
    try {
        const ids = getDeclinedListingIds(ngoId);
        if (!ids.includes(listingId)) {
            ids.push(listingId);
            localStorage.setItem(`biteshare_declined_ngo_${ngoId}`, JSON.stringify(ids));
            localStorage.setItem(`kindplates_declined_ngo_${ngoId}`, JSON.stringify(ids));
        }
    } catch (e) {
        console.error("Error saving declined listing ID", e);
    }
}

// Cancel claim dialog control
function cancelClaim(claimId) {
    pendingNgoClaimActionId = claimId;
    const errEl = document.getElementById("cancelClaimError");
    if (errEl) errEl.style.display = "none";
    const btn = document.getElementById("btnConfirmCancelClaim");
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Yes, Cancel Claim`;
    }
    const modal = document.getElementById("cancelClaimModal");
    if (modal) modal.classList.add("active");
}

function closeCancelClaimModal() {
    pendingNgoClaimActionId = null;
    const modal = document.getElementById("cancelClaimModal");
    if (modal) modal.classList.remove("active");
}

async function executeCancelClaim() {
    if (!pendingNgoClaimActionId) return;
    const claimId = pendingNgoClaimActionId;
    const btn = document.getElementById("btnConfirmCancelClaim");
    const errEl = document.getElementById("cancelClaimError");

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cancelling...`;
    }

    try {
        const res = await fetch(`${API_BASE}/api/claims/${claimId}/cancel`, { method: "POST" });
        if (res.ok) {
            closeCancelClaimModal();
            loadNgoPickups();
            loadAvailableFood();
        } else {
            const err = await res.json();
            if (errEl) {
                errEl.textContent = "Error: " + (err.detail || "Could not cancel claim");
                errEl.style.display = "block";
            }
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Yes, Cancel Claim`;
            }
        }
    } catch (e) {
        if (errEl) {
            errEl.textContent = "Server connection failed.";
            errEl.style.display = "block";
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Yes, Cancel Claim`;
        }
    }
}

// Mark food as collected dialog control
function markCollected(claimId) {
    pendingNgoClaimActionId = claimId;
    const errEl = document.getElementById("markCollectedError");
    if (errEl) errEl.style.display = "none";
    const btn = document.getElementById("btnConfirmCollected");
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-check-double"></i> Yes, Confirm Pickup`;
    }
    const modal = document.getElementById("markCollectedModal");
    if (modal) modal.classList.add("active");
}

function closeMarkCollectedModal() {
    pendingNgoClaimActionId = null;
    const modal = document.getElementById("markCollectedModal");
    if (modal) modal.classList.remove("active");
}

async function executeMarkCollected() {
    if (!pendingNgoClaimActionId) return;
    const claimId = pendingNgoClaimActionId;
    const btn = document.getElementById("btnConfirmCollected");
    const errEl = document.getElementById("markCollectedError");

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Updating Status...`;
    }

    try {
        const res = await fetch(`${API_BASE}/api/claims/${claimId}/complete`, { method: "POST" });
        if (res.ok) {
            closeMarkCollectedModal();
            loadNgoPickups();
        } else {
            const err = await res.json();
            if (errEl) {
                errEl.textContent = "Could not update status: " + (err.detail || "Database error");
                errEl.style.display = "block";
            }
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-check-double"></i> Yes, Confirm Pickup`;
            }
        }
    } catch (err) {
        if (errEl) {
            errEl.textContent = "Server error connecting to backend.";
            errEl.style.display = "block";
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-check-double"></i> Yes, Confirm Pickup`;
        }
    }
}

// Notifications drawer
async function loadNotifications() {
    const ngoId = currentNgo ? currentNgo.ngo_id : 1;
    try {
        const res = await fetch(`${API_BASE}/api/notifications?ngo_id=${ngoId}`);
        if (res.ok) {
            const list = await res.json();
            const unread = list.filter(n => !n.is_read).length;
            const badge = document.getElementById("notifBadge");
            badge.textContent = unread;
            badge.style.display = unread > 0 ? "flex" : "none";

            renderNotificationsList(list);
        }
    } catch (e) {
        // quiet error
    }
}

function renderNotificationsList(notifications) {
    const drawer = document.getElementById("drawerContent");
    if (!notifications || notifications.length === 0) {
        drawer.innerHTML = `
            <div style="text-align:center; padding:40px 10px; color:#94a3b8;">
                <i class="fa-regular fa-bell-slash" style="font-size:2rem; margin-bottom:8px;"></i>
                <p style="font-size:0.85rem;">No surplus food notifications yet.</p>
            </div>
        `;
        return;
    }

    drawer.innerHTML = notifications.map(n => `
        <div class="notif-item ${!n.is_read ? 'unread' : ''}" onclick="markNotifRead(${n.notification_id})">
            <h4 class="notif-title"><i class="fa-solid fa-bullhorn" style="color:#0284c7;"></i> ${escapeHtml(n.title)}</h4>
            <p class="notif-msg">${escapeHtml(n.message)}</p>
            <span class="notif-time"><i class="fa-regular fa-clock"></i> ${escapeHtml(n.created_at || "Recent")}</span>
        </div>
    `).join("");
}

async function markNotifRead(id) {
    try {
        await fetch(`${API_BASE}/api/notifications/${id}/read`, { method: "PUT" });
        loadNotifications();
    } catch (e) {}
}

function toggleNotifDrawer() {
    notifDrawerOpen = !notifDrawerOpen;
    document.getElementById("notifDrawer").classList.toggle("open", notifDrawerOpen);
    document.getElementById("drawerOverlay").classList.toggle("active", notifDrawerOpen);
}

function calculateHoursLeft(expiryStr) {
    if (!expiryStr) return "Few hours";
    const exp = new Date(expiryStr.replace(" ", "T"));
    const now = new Date();
    const diffMs = exp - now;
    if (diffMs <= 0) return "Expired";
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m left`;
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function logout() {
    localStorage.removeItem("biteshare_user");
    localStorage.removeItem("kindplates_user");
    localStorage.removeItem("foodbridge_user");
    window.location.href = "login.html";
}

// -----------------------------------------------------------------------------
// IMPACT & ANALYTICS MODULE (All in ONE Dashboard)
// -----------------------------------------------------------------------------
let categoryChartInstance = null;
let sourceChartInstance = null;

async function loadAnalyticsTab() {
    loadSummaryMetrics();
    loadLeaderboard();
    loadChartsData();
}

async function loadSummaryMetrics() {
    try {
        const res = await fetch(`${API_BASE}/api/analytics/summary`);
        if (res.ok) {
            const data = await res.json();
            animateCounter("valRescuedServings", data.rescued_servings || 0);
            animateCounter("valActiveCampuses", data.participating_universities || 0);
            animateCounter("valTotalListings", data.total_listings || 0);
            
            const wasteEl = document.getElementById("valWasteKg");
            if (wasteEl) wasteEl.textContent = `≈ ${data.waste_diverted_kg || 0} kg edible food saved`;
            const actPortEl = document.getElementById("valActivePortions");
            if (actPortEl) actPortEl.textContent = `${data.active_servings || 0} active portions currently available`;
            const co2El = document.getElementById("valCo2Kg");
            if (co2El) co2El.textContent = `${data.co2_emissions_prevented_kg || 0} kg`;
        }
    } catch (e) {
        console.error("Failed to load analytics summary", e);
    }
}

async function loadLeaderboard() {
    const tbody = document.getElementById("leaderboardBody");
    if (!tbody) return;
    try {
        const res = await fetch(`${API_BASE}/api/analytics/universities`);
        if (res.ok) {
            const list = await res.json();
            renderLeaderboard(list);
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Failed to fetch rankings.</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Server error.</td></tr>`;
    }
}

function renderLeaderboard(campuses) {
    const tbody = document.getElementById("leaderboardBody");
    if (!tbody) return;
    if (!campuses || campuses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">No campus rescue data recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = campuses.map((c, idx) => {
        const rank = idx + 1;
        let rankBadge = `<span style="font-weight:700; color:#5E6554;">#${rank}</span>`;
        if (rank === 1) rankBadge = `<span style="background:#FEF3C7; color:#B45309; padding:2px 8px; border-radius:999px; font-weight:700; font-size:0.75rem;">🥇 Top Contributor</span>`;
        else if (rank === 2) rankBadge = `<span style="background:#F1F5F9; color:#475569; padding:2px 8px; border-radius:999px; font-weight:700; font-size:0.75rem;">🥈 2nd</span>`;
        else if (rank === 3) rankBadge = `<span style="background:#FEF2F2; color:#991B1B; padding:2px 8px; border-radius:999px; font-weight:700; font-size:0.75rem;">🥉 3rd</span>`;

        const rate = c.rescue_rate_pct !== undefined ? c.rescue_rate_pct : (c.total_listings ? Math.round((c.servings_rescued / c.total_listings) * 10) : 0);

        return `
            <tr style="border-bottom:1px solid #EBF5FF;">
                <td style="padding:10px 8px;">${rankBadge}</td>
                <td style="padding:10px 8px;">
                    <strong>${escapeHtml(c.university_name)}</strong>
                    <div style="font-size:0.75rem; color:#64748B;"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(c.address ? c.address + ', ' + c.city + (c.pincode ? ' - ' + c.pincode : '') : c.city)} (${escapeHtml(c.short_code || "Campus")})</div>
                </td>
                <td style="padding:10px 8px; font-weight:600;">${c.total_listings || 0}</td>
                <td style="padding:10px 8px; font-weight:700; color:#050F2A;">${c.servings_rescued || 0} portions</td>
                <td style="padding:10px 8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:600; font-size:0.8rem; color:#050F2A;">${rate}%</span>
                        <div style="flex:1; height:6px; background:#D3E4F8; border-radius:999px; overflow:hidden; min-width:40px;">
                            <div style="width:${Math.min(rate, 100)}%; height:100%; background:linear-gradient(90deg, #7BBBFF, #B8A9FF); border-radius:999px;"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

async function loadChartsData() {
    if (!window.Chart) return;
    try {
        const res = await fetch(`${API_BASE}/api/analytics/categories`);
        if (res.ok) {
            const data = await res.json();
            renderCategoryChart(data.categories || []);
            renderSourceChart(data.sources || []);
        }
    } catch (e) {
        console.error("Failed to load chart metrics", e);
    }
}

function renderCategoryChart(categories) {
    const ctx = document.getElementById("categoryChart");
    if (!ctx) return;
    if (categoryChartInstance) categoryChartInstance.destroy();

    const labels = categories.map(c => c.label || c.food_category);
    const dataVals = categories.map(c => c.value || c.total_servings);

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['Cooked Meals', 'Packed Snacks', 'Bakery'],
            datasets: [{
                data: dataVals.length ? dataVals : [65, 20, 15],
                backgroundColor: ['#050F2A', '#1E3A8A', '#7BBBFF', '#B8A9FF', '#38BDF8'],
                borderWidth: 2,
                borderColor: '#F2FDFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, family: 'Plus Jakarta Sans' } } },
                title: { display: true, text: 'Food Surplus by Category', font: { size: 12, weight: 'bold', family: 'Clash Display' } }
            }
        }
    });
}

function renderSourceChart(sources) {
    const ctx = document.getElementById("sourceChart");
    if (!ctx) return;
    if (sourceChartInstance) sourceChartInstance.destroy();

    const labels = sources.map(s => s.label || s.food_source);
    const dataVals = sources.map(s => s.value || s.total_servings);

    sourceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['Canteen', 'Student Tiffin', 'Hostel Mess'],
            datasets: [{
                label: 'Portions Rescued',
                data: dataVals.length ? dataVals : [120, 25, 40],
                backgroundColor: '#7BBBFF',
                hoverBackgroundColor: '#B8A9FF',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Surplus Sources (Portions)', font: { size: 12, weight: 'bold', family: 'Clash Display' } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { font: { size: 10, family: 'Plus Jakarta Sans' } }, grid: { color: 'rgba(5, 15, 42, 0.06)' } },
                x: { ticks: { font: { size: 10, family: 'Plus Jakarta Sans' } }, grid: { display: false } }
            }
        }
    });
}

function animateCounter(elemId, targetVal) {
    const el = document.getElementById(elemId);
    if (!el) return;
    let start = 0;
    const duration = 600;
    const stepTime = 20;
    const totalSteps = duration / stepTime;
    const increment = targetVal / totalSteps;

    const timer = setInterval(() => {
        start += increment;
        if (start >= targetVal) {
            el.textContent = Number(targetVal).toLocaleString();
            clearInterval(timer);
        } else {
            el.textContent = Math.floor(start).toLocaleString();
        }
    }, stepTime);
}

function showToast(msg, type = "info") {
    let toast = document.getElementById("ngoToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "ngoToast";
        toast.style.position = "fixed";
        toast.style.bottom = "24px";
        toast.style.right = "24px";
        toast.style.zIndex = "10001";
        toast.style.padding = "12px 20px";
        toast.style.borderRadius = "10px";
        toast.style.fontSize = "0.88rem";
        toast.style.fontWeight = "600";
        toast.style.boxShadow = "0 10px 25px rgba(5, 15, 42, 0.18)";
        toast.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
        toast.style.display = "flex";
        toast.style.alignItems = "center";
        toast.style.gap = "10px";
        document.body.appendChild(toast);
    }
    if (type === "success") {
        toast.style.background = "#050F2A";
        toast.style.color = "#F2FDFF";
        toast.style.border = "1.5px solid #10B981";
        toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#34D399; font-size:1.1rem;"></i> ${escapeHtml(msg)}`;
    } else if (type === "error") {
        toast.style.background = "#050F2A";
        toast.style.color = "#F2FDFF";
        toast.style.border = "1.5px solid #EF4444";
        toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:#F87171; font-size:1.1rem;"></i> ${escapeHtml(msg)}`;
    } else {
        toast.style.background = "#050F2A";
        toast.style.color = "#F2FDFF";
        toast.style.border = "1.5px solid #7BBBFF";
        toast.innerHTML = `<i class="fa-solid fa-circle-info" style="color:#7BBBFF; font-size:1.1rem;"></i> ${escapeHtml(msg)}`;
    }
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
    }, 4000);
}
