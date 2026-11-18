// Auto-detect API base URL (uses local server on localhost, and secure live tunnel when hosted on Vercel)
const LIVE_BACKEND_URL = "https://collecting-writer-epic-indicates.trycloudflare.com";
const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? (window.location.port === "8000" ? "" : "http://127.0.0.1:8000")
    : LIVE_BACKEND_URL;

let currentUser = null;
let currentListings = [];
let pendingCancelListingId = null;

const DEFAULT_SHELF_LIFE_HOURS = 6;

document.addEventListener("DOMContentLoaded", () => {
    initUserSession();
    initDateTimeInputs();
    bindTimeInputEvents();
    loadMyListings();

    // Close confirmation dialog on Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeCancelDialog();
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
        document.getElementById("userNameDisplay").textContent = currentUser.name || "Student Donor";
        const univDisplay = currentUser.university_name || "Campus";
        document.getElementById("userUnivDisplay").textContent = univDisplay;
        if (currentUser.university_address) {
            document.getElementById("userUnivDisplay").title = `${univDisplay} - ${currentUser.university_address}, ${currentUser.city || 'Ahmedabad'}`;
        }
        
        // Initial in avatar circle
        const initial = (currentUser.name || "S").trim().charAt(0).toUpperCase();
        document.getElementById("avatarInitial").textContent = initial;

        // If canteen staff, redirect directly to canteen portal
        if (currentUser.role === "canteen_staff") {
            window.location.href = "canteen-dashboard.html";
            return;
        }
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
async function submitFoodListing(e) {
    e.preventDefault();
    clearAlert();

    const foodSource = "student_tiffin";
    const foodTitle = document.getElementById("foodTitle").value.trim();
    const foodCategory = document.getElementById("foodCategory").value;
    const quantity = parseInt(document.getElementById("quantityServings").value);
    const preparedTime = document.getElementById("preparedTime").value;
    const expiryTime = document.getElementById("expiryTime").value;
    const description = document.getElementById("description").value.trim();

    // Validation
    if (quantity <= 0) {
        showFormAlert("Quantity must be at least 1 serving.", "error");
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
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting & Triggering Alerts...`;

    const payload = {
        donor_id: currentUser.user_id || 1,
        university_id: currentUser.university_id || 1,
        food_title: foodTitle,
        food_category: foodCategory,
        food_source: foodSource,
        quantity_servings: quantity,
        description: description,
        prepared_time: preparedTime.replace("T", " ") + ":00",
        expiry_time: expiryTime.replace("T", " ") + ":00",
        pickup_location: (currentUser && currentUser.university_name) ? `${currentUser.university_name} Hostel Desk, ${currentUser.university_address || 'Main Campus'}` : "Campus Main Reception"
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
        showFormAlert("Unable to connect to server: " + (err.message || "Network request failed. Ensure http://127.0.0.1:8000 is running."), "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>List Food & Notify Local NGOs</span>`;
    }
}

// Load current user's listings
async function loadMyListings() {
    const container = document.getElementById("listingsContainer");
    const userId = currentUser ? currentUser.user_id : 1;

    try {
        const res = await fetch(`${API_BASE}/api/listings/my?user_id=${userId}`);
        if (res.ok) {
            const listings = await res.json();
            currentListings = listings;
            renderListings(listings);
            updateStats(listings);
        } else {
            container.innerHTML = `<div class="empty-state"><p>Could not load listings.</p></div>`;
        }
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><p>Server not reachable.</p></div>`;
    }
}

function renderListings(items) {
    const container = document.getElementById("listingsContainer");
    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-plate-wheat"></i>
                <p>No food listings posted yet.<br>Use the form on the left to list surplus tiffin or canteen meals!</p>
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
                    Cancel Listing
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
                    </div>
                </div>
            `;
        } else if (item.status === "collected") {
            statusBadge = `<span class="badge-status collected"><i class="fa-solid fa-circle-check"></i> Rescued & Collected</span>`;
        }

        const sourceLabel = item.food_source === "student_tiffin" ? "🎒 Student Tiffin" : "🏢 Canteen Surplus";
        const isCanteen = item.food_source === "canteen" || item.food_source === "hostel_mess";
        const quantityDisplay = isCanteen 
            ? `<strong>${item.quantity_servings}</strong> kg` 
            : `<strong>${item.quantity_servings}</strong> servings (${item.quantity_servings} people)`;
        const quantityIcon = isCanteen ? "fa-solid fa-weight-hanging" : "fa-solid fa-users";
        const expiryFormatted = formatReadableDate(item.expiry_time);

        return `
            <div class="listing-item" id="listing-${item.listing_id}">
                <div class="item-top">
                    <div>
                        <span style="font-size:0.72rem; font-weight:700; color:#050F2A; text-transform:uppercase; letter-spacing:0.04em;">
                            ${sourceLabel}
                        </span>
                        <h4 class="item-title">${escapeHtml(item.food_title)}</h4>
                    </div>
                    ${statusBadge}
                </div>

                <div class="item-meta">
                    <div class="meta-chip">
                        <i class="${quantityIcon}" style="color:var(--primary);"></i>
                        ${quantityDisplay}
                    </div>
                    <div class="meta-chip">
                        <i class="fa-solid fa-location-dot" style="color:#ef4444;"></i>
                        ${escapeHtml(item.pickup_location)}
                    </div>
                    <div class="meta-chip">
                        <i class="fa-solid fa-hourglass-half" style="color:#f59e0b;"></i>
                        Consume before: ${expiryFormatted}
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
    const totalServings = items.reduce((sum, item) => sum + (item.quantity_servings || 0), 0);
    const activeCount = items.filter(item => item.status === "available").length;
    const rescuedServings = items
        .filter(item => item.status === "collected" || item.status === "claimed")
        .reduce((sum, item) => sum + (item.quantity_servings || 0), 0);

    document.getElementById("statTotalServings").textContent = totalServings;
    document.getElementById("statActiveListings").textContent = activeCount;
    document.getElementById("statRescuedServings").textContent = rescuedServings;
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
        if (titleEl) titleEl.textContent = item.food_title || "Food Listing";
        if (qtyEl) {
            const isCanteen = item.food_source === "canteen" || item.food_source === "hostel_mess";
            qtyEl.innerHTML = isCanteen
                ? `<i class="fa-solid fa-weight-hanging"></i> ${item.quantity_servings} kg`
                : `<i class="fa-solid fa-users"></i> ${item.quantity_servings} servings`;
        }
        if (locEl) {
            locEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.pickup_location || "Campus")}`;
        }
    } else {
        if (titleEl) titleEl.textContent = `Food Listing #${listingId}`;
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
        const userId = currentUser ? currentUser.user_id : 1;
        const res = await fetch(`${API_BASE}/api/listings/${listingId}?user_id=${userId}`, {
            method: "DELETE"
        });

        if (res.ok) {
            closeCancelDialog();
            showFormAlert("Food listing has been successfully cancelled.", "success");
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
