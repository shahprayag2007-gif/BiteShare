// Auto-detect API base URL (handles http://127.0.0.1:8000, VS Code Live Server port 5500, and direct file:/// opening)
const API_BASE = (window.location.port === "8000")
    ? ""
    : "http://127.0.0.1:8000";

let categoryChartInstance = null;
let sourceChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    // Analytics is exclusively for verified NGO partners & consolidated in the NGO Dashboard
    const raw = localStorage.getItem("biteshare_user") || localStorage.getItem("kindplates_user") || localStorage.getItem("foodbridge_user");
    if (!raw) {
        window.location.href = "login.html";
        return;
    }
    try {
        const user = JSON.parse(raw);
        if (user.role !== "ngo") {
            alert("Access restricted: Analytics are exclusively available to registered NGO partners.");
            if (user.role === "canteen_staff") window.location.href = "canteen-dashboard.html";
            else window.location.href = "student-dashboard.html";
            return;
        }
        // Seamlessly redirect to the unified single NGO Dashboard with Analytics tab active
        window.location.href = "ngo-dashboard.html?tab=analytics";
    } catch(e) {
        window.location.href = "login.html";
    }
});

// Load summary impact metrics
async function loadSummaryMetrics() {
    try {
        const res = await fetch(`${API_BASE}/api/analytics/summary`);
        if (res.ok) {
            const data = await res.json();
            animateCounter("valRescuedServings", data.rescued_servings || 0);
            animateCounter("valActiveCampuses", data.participating_universities || 0);
            animateCounter("valTotalListings", data.total_listings || 0);
            
            document.getElementById("valWasteKg").textContent = `≈ ${data.waste_diverted_kg || 0} kg edible food saved`;
            document.getElementById("valActivePortions").textContent = `${data.active_servings || 0} active portions currently available`;
            document.getElementById("valCo2Kg").textContent = `${data.co2_emissions_prevented_kg || 0} kg`;
        }
    } catch (e) {
        console.error("Failed to load analytics summary", e);
    }
}

// Load University Leaderboard
async function loadLeaderboard() {
    const tbody = document.getElementById("leaderboardBody");
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
    if (!campuses || campuses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">No campus records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = campuses.map((c, index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? "rank-1" : (rank === 2 ? "rank-2" : (rank === 3 ? "rank-3" : ""));
        const rate = c.rescue_rate_pct || 0;

        return `
            <tr>
                <td>
                    <span class="rank-badge ${rankClass}">${rank}</span>
                </td>
                <td class="univ-info-cell">
                    <h4>${escapeHtml(c.university_name)}</h4>
                    <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(c.address ? c.address + ', ' + c.city + (c.pincode ? ' - ' + c.pincode : '') : c.city)} &bull; Code: ${escapeHtml(c.short_code || "N/A")}</span>
                </td>
                <td>
                    <strong>${c.total_listings}</strong> posts
                </td>
                <td>
                    <strong style="color:#059669; font-size:1rem;">${c.servings_rescued}</strong> servings
                    <div style="font-size:0.75rem; color:#94a3b8;">of ${c.total_servings_offered} offered</div>
                </td>
                <td>
                    <div style="font-weight:700; color:#0f172a; font-size:0.85rem;">${rate}%</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${rate}%;"></div>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// Load Chart.js Data
async function loadChartsData() {
    try {
        const res = await fetch(`${API_BASE}/api/analytics/categories`);
        if (res.ok) {
            const data = await res.json();
            renderCategoryChart(data.categories);
            renderSourceChart(data.sources);
        }
    } catch (e) {
        console.error("Could not load chart data", e);
    }
}

function renderCategoryChart(categories) {
    const ctx = document.getElementById("categoryChart").getContext("2d");
    const labels = categories.map(c => c.label);
    const values = categories.map(c => c.value);

    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#050F2A', '#1E3A8A', '#7BBBFF', '#B8A9FF', '#38BDF8'],
                borderWidth: 2,
                borderColor: '#F2FDFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" } }
                }
            }
        }
    });
}

function renderSourceChart(sources) {
    const ctx = document.getElementById("sourceChart").getContext("2d");
    const labels = sources.map(s => s.label);
    const values = sources.map(s => s.value);

    if (sourceChartInstance) sourceChartInstance.destroy();

    sourceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Servings Rescued',
                data: values,
                backgroundColor: '#050F2A',
                hoverBackgroundColor: '#7BBBFF',
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { display: false }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

// Smooth Number Counter Animation
function animateCounter(elemId, targetValue) {
    const elem = document.getElementById(elemId);
    let start = 0;
    const duration = 1000;
    const step = Math.ceil(targetValue / (duration / 25)) || 1;

    const timer = setInterval(() => {
        start += step;
        if (start >= targetValue) {
            elem.textContent = targetValue.toLocaleString();
            clearInterval(timer);
        } else {
            elem.textContent = start.toLocaleString();
        }
    }, 25);
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
