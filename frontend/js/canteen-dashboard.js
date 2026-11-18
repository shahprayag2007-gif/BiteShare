// Auto-detect API base URL (handles http://127.0.0.1:8000, VS Code Live Server port 5500, and direct file:/// opening)
const API_BASE = (window.location.port === "8000")
    ? ""
    : "http://127.0.0.1:8000";

let currentUser = null;
let currentListings = [];
let pendingCancelListingId = null;
let currentFilter = "all"; // "all", "available", "claimed", "past"

const DEFAULT_SHELF_LIFE_HOURS = 6;

document.addEventListener("DOMContentLoaded", () => {
    initUserSession();
    initDateTimeInputs();
    bindTimeInputEvents();
    loadMyListings();

    // Close modals on Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeCancelDialog();
            closePastListingsModal();
        }
    });

    // Close confirmation dialog when clicking on overlay background
    const modal = document.getElementById("cancelConfirmModal");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeCancelDialog();
            }
        });
    }

    // Close past listings modal when clicking on overlay background
    const pastModal = document.getElementById("pastListingsModal");
    if (pastModal) {
        pastModal.addEventListener("click", (e) => {
            if (e.target === pastModal) {
                closePastListingsModal();
            }
        });
    }
});

// Check if user is logged in
function initUserSession() {
    const raw = localStorage.getItem("biteshare_user") || localStorage.getItem("kindplates_user") || localStorage.getItem("foodbridge_user");
    if (!raw) {
        window.location.href = "login.html";
        return;
    }

    try {
        currentUser = JSON.parse(raw);

        // If a student tries to access canteen portal, redirect to student portal
        if (currentUser.role === "student") {
            window.location.href = "student-dashboard.html";
            return;
        } else if (currentUser.role === "ngo") {
            window.location.href = "ngo-dashboard.html";
            return;
        }

        document.getElementById("userNameDisplay").textContent = currentUser.name || "Canteen Incharge";
        const univDisplay = `${currentUser.university_name || "Campus"} Canteen`;
        document.getElementById("userUnivDisplay").textContent = univDisplay;
        if (currentUser.university_address) {
            document.getElementById("userUnivDisplay").title = `${currentUser.university_name} - ${currentUser.university_address}, ${currentUser.city || 'Ahmedabad'}`;
        }
        
        const initial = (currentUser.name || "C").trim().charAt(0).toUpperCase();
        document.getElementById("avatarInitial").textContent = initial;
    } catch (e) {
        console.error("Invalid session data, resetting", e);
        logout();
    }
}

// Set up default timestamps for datetime-local inputs (Default food life: 6 hours)
function initDateTimeInputs() {
    const now = new Date();
    const defaultExpiry = new Date(now.getTime() + (DEFAULT_SHELF_LIFE_HOURS * 60 * 60 * 1000));

    const prepElem = document.getElementById("preparedTime");
    const expElem = document.getElementById("expiryTime");
    if (prepElem) prepElem.value = toDatetimeLocalString(now);
    if (expElem) expElem.value = toDatetimeLocalString(defaultExpiry);
}

// Bind event listeners for live dynamic updates
function bindTimeInputEvents() {
    const prepElem = document.getElementById("preparedTime");
    if (prepElem) {
        prepElem.addEventListener("input", onPreparedTimeChange);
        prepElem.addEventListener("change", onPreparedTimeChange);
    }
}

// Automatically recalculate consume-by time whenever prepared-at is entered or modified
function onPreparedTimeChange() {
    const prepInput = document.getElementById("preparedTime")?.value;
    if (!prepInput) return;
    const baseDate = new Date(prepInput);
    if (!isNaN(baseDate.getTime())) {
        const autoExpiry = new Date(baseDate.getTime() + (DEFAULT_SHELF_LIFE_HOURS * 60 * 60 * 1000));
        const expElem = document.getElementById("expiryTime");
        if (expElem) {
            expElem.value = toDatetimeLocalString(autoExpiry);
        }
    }
}

function setExpiryHours(hours) {
    const preparedInput = document.getElementById("preparedTime")?.value;
    const baseDate = preparedInput ? new Date(preparedInput) : new Date();
    if (!isNaN(baseDate.getTime())) {
        const newExpiry = new Date(baseDate.getTime() + (hours * 60 * 60 * 1000));
        const expElem = document.getElementById("expiryTime");
        if (expElem) {
            expElem.value = toDatetimeLocalString(newExpiry);
        }
    }
}

function toDatetimeLocalString(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Submit food entry
async function submitCanteenFood(e) {
    e.preventDefault();
    clearAlert();

    const foodTitle = document.getElementById("foodTitle").value.trim();
    const foodCategory = document.getElementById("foodCategory").value;
    const quantity = parseInt(document.getElementById("quantityServings").value);
    const preparedTime = document.getElementById("preparedTime").value;
    const expiryTime = document.getElementById("expiryTime").value;
    const description = document.getElementById("description").value.trim();

    // Validation
    if (quantity <= 0) {
        showFormAlert("Quantity must be at least 1 kg.", "error");
        return;
    }

    const prepDate = new Date(preparedTime);
    const expDate = new Date(expiryTime);
    if (expDate <= prepDate) {
        showFormAlert("Expiry time must be later than the preparation time!", "error");
        return;
    }

    const submitBtn = document.getElementById("btnSubmitListing");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting Canteen Batch...`;

    const payload = {
        donor_id: currentUser.user_id || 2,
        university_id: currentUser.university_id || 1,
        food_title: foodTitle,
        food_category: foodCategory,
        food_source: "canteen", // Always canteen
        quantity_servings: quantity, // represents kg
        description: description,
        prepared_time: preparedTime.replace("T", " ") + ":00",
        expiry_time: expiryTime.replace("T", " ") + ":00",
        pickup_location: (currentUser && currentUser.university_name) ? `${currentUser.university_name} Central Canteen, ${currentUser.university_address || 'Main Campus'}` : "Campus Canteen Gate"
    };

    try {
        const res = await fetch(`${API_BASE}/api/listings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            showFormAlert("🎉 " + data.message, "success");
            
            // Reset form
            document.getElementById("foodTitle").value = "";
            document.getElementById("description").value = "";
            initDateTimeInputs();

            // Refresh listings list
            await loadMyListings();
        } else {
            const err = await res.json();
            showFormAlert("Error: " + (err.detail || "Could not post food listing"), "error");
        }
    } catch (err) {
        console.error("Submission failed", err);
        showFormAlert("Unable to connect to server: " + (err.message || "Network request failed."), "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>List Canteen Food &amp; Notify Local NGOs</span>`;
    }
}

// Load current canteen's listings
async function loadMyListings() {
    const container = document.getElementById("listingsContainer");
    const userId = currentUser ? currentUser.user_id : 2;

    try {
        const res = await fetch(`${API_BASE}/api/listings/my?user_id=${userId}`);
        if (res.ok) {
            const listings = await res.json();
            currentListings = listings;
            updateFilterBadges(listings);
            applyFilterAndRender();
            updateStats(listings);
        } else {
            container.innerHTML = `<div class="empty-state"><p>Could not load listings.</p></div>`;
        }
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><p>Server not reachable.</p></div>`;
    }
}

// Update count badges on the filter tabs
function updateFilterBadges(items) {
    const allCount = items.length;
    const activeCount = items.filter(i => i.status === "available").length;
    const claimedCount = items.filter(i => i.status === "claimed").length;
    const pastCount = items.filter(i => i.status === "collected" || i.status === "expired").length;

    const bAll = document.getElementById("badgeAll");
    const bActive = document.getElementById("badgeActive");
    const bClaimed = document.getElementById("badgeClaimed");
    const bPast = document.getElementById("badgePast");

    if (bAll) bAll.textContent = allCount;
    if (bActive) bActive.textContent = activeCount;
    if (bClaimed) bClaimed.textContent = claimedCount;
    if (bPast) bPast.textContent = pastCount;
}

// Switch between All / Active / Claimed / Past listings
function setListingFilter(filterType) {
    currentFilter = filterType;
    const tabMap = {
        all: "tabAll",
        available: "tabActive",
        active: "tabActive",
        claimed: "tabClaimed",
        past: "tabPast"
    };

    ["tabAll", "tabActive", "tabClaimed", "tabPast"].forEach(tabId => {
        const btn = document.getElementById(tabId);
        if (btn) {
            if (tabId === tabMap[filterType]) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        }
    });

    applyFilterAndRender();
}

function applyFilterAndRender() {
    let filtered = currentListings;
    if (currentFilter === "available" || currentFilter === "active") {
        filtered = currentListings.filter(i => i.status === "available");
    } else if (currentFilter === "claimed") {
        filtered = currentListings.filter(i => i.status === "claimed");
    } else if (currentFilter === "past") {
        filtered = currentListings.filter(i => i.status === "collected" || i.status === "expired");
    }
    renderListings(filtered);
}

function renderListings(items) {
    const container = document.getElementById("listingsContainer");
    if (!items || items.length === 0) {
        if (currentFilter === "past") {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <p>No past completed batches found.<br>When nearby NGOs collect and rescue your food batches, they will appear here in your past listings history.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-utensils"></i>
                <p>No canteen food batches found.<br>Use the form on the left to post surplus mess or cafeteria food!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        let statusBadge = "";
        let claimDetails = "";
        let cancelBtn = "";

        if (item.status === "available") {
            statusBadge = `<span class="badge-status available"><i class="fa-solid fa-clock"></i> Available (Waiting for NGO)</span>`;
            cancelBtn = `
                <button 
                    onclick="cancelListing(${item.listing_id})" 
                    style="background:none; border:none; color:#ef4444; font-size:0.75rem; cursor:pointer; text-decoration:underline; margin-left:auto;">
                    Cancel Batch
                </button>
            `;
        } else if (item.status === "claimed") {
            statusBadge = `<span class="badge-status claimed"><i class="fa-solid fa-truck"></i> Claimed for Pickup</span>`;
            claimDetails = `
                <div class="claim-alert-box">
                    <i class="fa-solid fa-bell"></i>
                    <div>
                        <strong>Claimed by:</strong> ${item.claimed_by_ngo || "Local Verified NGO"}
                        ${item.volunteer_name ? `<br><span>Volunteer: ${item.volunteer_name} (${item.volunteer_phone || "Contact pending"})</span>` : ""}
                        ${item.expected_pickup_time ? `<br><small style="color:#B45309;"><i class="fa-regular fa-clock"></i> ETA: ${formatReadableDate(item.expected_pickup_time)}</small>` : ""}
                    </div>
                </div>
            `;
        } else if (item.status === "collected") {
            statusBadge = `<span class="badge-status collected"><i class="fa-solid fa-circle-check"></i> Rescued &amp; Collected</span>`;
            const co2Saved = (item.quantity_servings * 2.5).toFixed(1);
            claimDetails = `
                <div class="past-collected-box">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span><i class="fa-solid fa-award" style="color:#16a34a;"></i> <strong>Rescued by:</strong> ${escapeHtml(item.claimed_by_ngo || "Verified NGO Partner")}</span>
                        <span style="font-size:0.72rem; background:#DCFCE7; color:#166534; font-weight:700; padding:2px 8px; border-radius:999px;">Delivered</span>
                    </div>
                    ${item.volunteer_name ? `<div style="font-size:0.78rem; color:#166534;"><i class="fa-solid fa-user-check"></i> Volunteer: ${escapeHtml(item.volunteer_name)} ${item.volunteer_phone ? `(${escapeHtml(item.volunteer_phone)})` : ""}</div>` : ""}
                    <div style="font-size:0.76rem; color:#15803d; margin-top:2px;">
                        <i class="fa-solid fa-leaf"></i> <strong>${item.quantity_servings} kg food saved</strong> &bull; ~${co2Saved} kg CO₂ prevented from entering landfills
                    </div>
                </div>
            `;
        }

        const expiryFormatted = formatReadableDate(item.expiry_time);
        const isPast = item.status === "collected";

        return `
            <div class="listing-item" id="listing-${item.listing_id}" style="${isPast ? 'border-color:#C4D7CE; background:#FAFBF8;' : ''}">
                <div class="item-top">
                    <div>
                        <span style="font-size:0.72rem; font-weight:700; color:#050F2A; text-transform:uppercase; letter-spacing:0.04em;">
                            🏢 Canteen Surplus ${isPast ? '<small style="color:#16a34a; font-weight:bold;">&bull; Past Rescue</small>' : ''}
                        </span>
                        <h4 class="item-title">${escapeHtml(item.food_title)}</h4>
                    </div>
                    ${statusBadge}
                </div>

                <div class="item-meta">
                    <div class="meta-chip">
                        <i class="fa-solid fa-weight-hanging" style="color:var(--primary);"></i>
                        <strong>${item.quantity_servings}</strong> kg
                    </div>
                    <div class="meta-chip">
                        <i class="fa-solid fa-location-dot" style="color:#ef4444;"></i>
                        ${escapeHtml(item.pickup_location)}
                    </div>
                    <div class="meta-chip">
                        <i class="fa-solid fa-hourglass-half" style="color:#f59e0b;"></i>
                        ${isPast ? 'Logged on: ' + formatReadableDate(item.created_at) : 'Consume before: ' + expiryFormatted}
                    </div>
                </div>

                ${item.description ? `<p style="font-size:0.8rem; color:#64748b; margin-bottom:8px;">${escapeHtml(item.description)}</p>` : ""}

                ${claimDetails}

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                    <span style="font-size:0.72rem; color:#94a3b8;">Listed: ${item.created_at || "Just now"}</span>
                    ${cancelBtn}
                </div>
            </div>
        `;
    }).join("");
}

function updateStats(items) {
    const totalKg = items.reduce((sum, item) => sum + (item.quantity_servings || 0), 0);
    const activeCount = items.filter(item => item.status === "available").length;
    const rescuedKg = items
        .filter(item => item.status === "collected" || item.status === "claimed")
        .reduce((sum, item) => sum + (item.quantity_servings || 0), 0);

    document.getElementById("statTotalServings").textContent = `${totalKg} kg`;
    document.getElementById("statActiveListings").textContent = activeCount;
    document.getElementById("statRescuedServings").textContent = `${rescuedKg} kg`;
}

// Open custom confirmation dialog popup
function cancelListing(listingId) {
    pendingCancelListingId = listingId;
    const modal = document.getElementById("cancelConfirmModal");
    if (!modal) return;

    // Find listing in current list to show preview in dialog
    const item = (currentListings || []).find(l => l.listing_id === listingId);
    const titleEl = document.getElementById("dialogItemTitle");
    const qtyEl = document.getElementById("dialogItemQuantity");
    const locEl = document.getElementById("dialogItemLocation");
    const errorEl = document.getElementById("dialogErrorMsg");

    if (errorEl) errorEl.style.display = "none";

    if (item) {
        if (titleEl) titleEl.textContent = item.food_title || "Food Batch Listing";
        if (qtyEl) {
            qtyEl.innerHTML = `<i class="fa-solid fa-weight-hanging"></i> ${item.quantity_servings} kg`;
        }
        if (locEl) {
            locEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.pickup_location || "Canteen / Mess")}`;
        }
    } else {
        if (titleEl) titleEl.textContent = `Canteen Batch #${listingId}`;
        if (qtyEl) qtyEl.innerHTML = "";
        if (locEl) locEl.innerHTML = "";
    }

    const confirmBtn = document.getElementById("dialogConfirmBtn");
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> <span>Yes, Cancel Listing</span>`;
    }

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
}

// Close custom confirmation dialog popup
function closeCancelDialog() {
    pendingCancelListingId = null;
    const modal = document.getElementById("cancelConfirmModal");
    if (modal) {
        modal.classList.remove("active");
    }
    document.body.style.overflow = "";
}

// Execute cancellation after user confirms in dialog
async function executeCancelListing() {
    if (!pendingCancelListingId) return;

    const listingId = pendingCancelListingId;
    const confirmBtn = document.getElementById("dialogConfirmBtn");
    const errorEl = document.getElementById("dialogErrorMsg");

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Cancelling...`;
    }

    try {
        const userId = currentUser ? currentUser.user_id : 2;
        const res = await fetch(`${API_BASE}/api/listings/${listingId}?user_id=${userId}`, {
            method: "DELETE"
        });

        if (res.ok) {
            closeCancelDialog();
            showFormAlert("Canteen food batch listing has been successfully cancelled.", "success");
            loadMyListings();
        } else {
            const err = await res.json();
            const msg = err.detail || "Could not cancel listing.";
            if (errorEl) {
                errorEl.textContent = msg;
                errorEl.style.display = "block";
            } else {
                showFormAlert(msg, "error");
            }
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> <span>Yes, Cancel Listing</span>`;
            }
        }
    } catch (err) {
        const msg = "Unable to connect to server. Please verify backend is running.";
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = "block";
        } else {
            showFormAlert(msg, "error");
        }
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> <span>Yes, Cancel Listing</span>`;
        }
    }
}

function showFormAlert(msg, type) {
    const alertBox = document.getElementById("formAlert");
    alertBox.textContent = msg;
    alertBox.style.display = "block";
    if (type === "success") {
        alertBox.style.background = "#ecfdf5";
        alertBox.style.color = "#065f46";
        alertBox.style.border = "1px solid #a7f3d0";
    } else {
        alertBox.style.background = "#fee2e2";
        alertBox.style.color = "#991b1b";
        alertBox.style.border = "1px solid #fecaca";
    }
}

function clearAlert() {
    const alertBox = document.getElementById("formAlert");
    alertBox.style.display = "none";
}

function formatReadableDate(dateStr) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + " (" + d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ")";
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
// PAST LISTINGS HISTORY ARCHIVE MODAL
// -----------------------------------------------------------------------------
function openPastListingsModal() {
    const modal = document.getElementById("pastListingsModal");
    if (!modal) return;

    const pastItems = (currentListings || []).filter(i => i.status === "collected" || i.status === "expired");
    const totalKg = pastItems.reduce((sum, i) => sum + (i.quantity_servings || 0), 0);
    const co2Averted = (totalKg * 2.5).toFixed(1);

    const elTotalPast = document.getElementById("archiveTotalPast");
    const elTotalKg = document.getElementById("archiveTotalKg");
    const elTotalCO2 = document.getElementById("archiveTotalCO2");

    if (elTotalPast) elTotalPast.textContent = pastItems.length;
    if (elTotalKg) elTotalKg.textContent = `${totalKg} kg`;
    if (elTotalCO2) elTotalCO2.textContent = `${co2Averted} kg`;

    const searchInput = document.getElementById("archiveSearchInput");
    if (searchInput) searchInput.value = "";

    renderArchiveItems(pastItems);
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closePastListingsModal() {
    const modal = document.getElementById("pastListingsModal");
    if (modal) {
        modal.classList.remove("active");
    }
    document.body.style.overflow = "";
}

function filterArchiveListings() {
    const searchInput = document.getElementById("archiveSearchInput");
    const query = (searchInput ? searchInput.value : "").toLowerCase().trim();
    const pastItems = (currentListings || []).filter(i => i.status === "collected" || i.status === "expired");

    if (!query) {
        renderArchiveItems(pastItems);
        return;
    }

    const matching = pastItems.filter(i =>
        (i.food_title && i.food_title.toLowerCase().includes(query)) ||
        (i.claimed_by_ngo && i.claimed_by_ngo.toLowerCase().includes(query)) ||
        (i.pickup_location && i.pickup_location.toLowerCase().includes(query)) ||
        (i.volunteer_name && i.volunteer_name.toLowerCase().includes(query)) ||
        (i.food_category && i.food_category.toLowerCase().includes(query))
    );

    renderArchiveItems(matching);
}

function renderArchiveItems(items) {
    const container = document.getElementById("archiveListingsContainer");
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:36px 14px; color:#8E9584;">
                <i class="fa-solid fa-clock-rotate-left" style="font-size:2.2rem; margin-bottom:10px; color:#D8D1C2;"></i>
                <p style="font-size:0.9rem; margin:0; font-weight:600;">No past completed food batches found.</p>
                <small style="color:#A8A29E;">Batches rescued and picked up by NGOs will be automatically archived here.</small>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        const co2 = (item.quantity_servings * 2.5).toFixed(1);
        const dateStr = formatReadableDate(item.created_at || item.prepared_time);
        const ngoName = item.claimed_by_ngo || "Verified NGO Partner";
        const isCollected = item.status === "collected";

        return `
            <div style="background:#FFFFFF; border:1.5px solid #D3E4F8; border-radius:10px; padding:14px; box-shadow:0 1px 3px rgba(5,15,42,0.05); display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">
                            Batch #${item.listing_id} &bull; ${item.food_category ? item.food_category.replace(/_/g, ' ') : 'Cooked Meal'}
                        </div>
                        <h4 style="font-size:0.98rem; font-weight:700; color:#050F2A; margin:2px 0 0;">${escapeHtml(item.food_title)}</h4>
                    </div>
                    <span class="badge-status ${isCollected ? 'collected' : 'available'}" style="font-size:0.72rem;">
                        <i class="fa-solid ${isCollected ? 'fa-circle-check' : 'fa-clock'}"></i>
                        ${isCollected ? 'Rescued &amp; Delivered' : item.status}
                    </span>
                </div>

                <div style="display:flex; flex-wrap:wrap; gap:14px; font-size:0.8rem; color:#5E6554;">
                    <span><i class="fa-solid fa-weight-hanging" style="color:var(--primary);"></i> <strong>${item.quantity_servings} kg</strong></span>
                    <span><i class="fa-solid fa-calendar-day" style="color:#C27803;"></i> ${dateStr}</span>
                    <span><i class="fa-solid fa-location-dot" style="color:#ef4444;"></i> ${escapeHtml(item.pickup_location || "Campus Canteen")}</span>
                </div>

                ${item.description ? `<p style="font-size:0.78rem; color:#78716C; margin:0;">${escapeHtml(item.description)}</p>` : ''}

                <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:6px; padding:8px 12px; font-size:0.78rem; color:#166534; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <div>
                        <strong><i class="fa-solid fa-handshake-angle"></i> Rescued by:</strong> ${escapeHtml(ngoName)}
                        ${item.volunteer_name ? ` &bull; Volunteer: ${escapeHtml(item.volunteer_name)}` : ""}
                    </div>
                    <div style="font-weight:700; color:#15803D;">
                        <i class="fa-solid fa-leaf"></i> ~${co2} kg CO₂ saved
                    </div>
                </div>
            </div>
        `;
    }).join("");
}
