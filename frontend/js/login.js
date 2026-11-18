// Auto-detect API base URL (uses local server on localhost, and secure live tunnel when hosted on Vercel)
const LIVE_BACKEND_URL = "https://collecting-writer-epic-indicates.trycloudflare.com";
const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? (window.location.port === "8000" ? "" : "http://127.0.0.1:8000")
    : LIVE_BACKEND_URL;

// Default fallback universities matching DBMS seed_data.sql (Operating City: Ahmedabad)
const DEFAULT_UNIVERSITIES = [
    { university_id: 1, name: "Nirma University", short_code: "NU", address: "Sarkhej - Gandhinagar Highway, Gota", city: "Ahmedabad", pincode: "382481" },
    { university_id: 2, name: "Adani University", short_code: "AU", address: "Shantigram Township, Near Vaishnodevi Circle, SG Highway", city: "Ahmedabad", pincode: "382421" },
    { university_id: 3, name: "LJ University", short_code: "LJU", address: "Near Sarkhej-Sanand Circle, S.G. Road, Makarba", city: "Ahmedabad", pincode: "382210" },
    { university_id: 4, name: "LD College of Engineering", short_code: "LDC", address: "Opp. Gujarat University, 120 Circular Road, Navrangpura", city: "Ahmedabad", pincode: "380015" },
    { university_id: 5, name: "Ahmedabad University", short_code: "AHMU", address: "Commerce Six Roads, Navrangpura", city: "Ahmedabad", pincode: "380009" },
    { university_id: 6, name: "Vishwakarma Government Engineering College (VGEC)", short_code: "VGEC", address: "Nr. Visat Three Roads, Sabarmati-Koba Highway, Chandkheda", city: "Ahmedabad", pincode: "382424" },
    { university_id: 7, name: "Indus University", short_code: "IU", address: "Rancharda, Via Thaltej, Shilaj", city: "Ahmedabad", pincode: "382115" }
];

let currentMode = "login"; // "login" or "register"
let currentRole = "student"; // "student", "canteen_staff", or "ngo"

// Fallback test accounts for offline environment resilience
const FALLBACK_ACCOUNTS = {
    student_nirma: {
        role: "student",
        university_id: 1,
        identifier: "rushirajvala@gmail.com",
        password: "password123"
    },
    canteen_nirma: {
        role: "canteen_staff",
        university_id: 1,
        identifier: "modhabrothers@yahoo.com",
        password: "password123"
    },
    student_adani: {
        role: "student",
        university_id: 2,
        identifier: "jayhay@gmail.com",
        password: "password123"
    },
    ngo_rha: {
        role: "ngo",
        university_id: null,
        identifier: "robinhood@food.org",
        password: "password123"
    }
};

document.addEventListener("DOMContentLoaded", () => {
    loadUniversities();
});

// Load universities dynamically from API with fallback
async function loadUniversities() {
    const selects = [
        document.getElementById("universitySelect"),
        document.getElementById("regUniversitySelect")
    ];

    selects.forEach(sel => {
        if (sel) {
            sel.innerHTML = `<option value="" disabled selected>-- Choose your campus / university --</option>`;
        }
    });

    try {
        const response = await fetch(`${API_BASE}/api/universities`);
        if (response.ok) {
            const list = await response.json();
            renderUniversityOptions(list);
            return;
        }
    } catch (err) {
        console.warn("Backend not yet started or offline, using default DBMS seed universities.", err);
    }

    renderUniversityOptions(DEFAULT_UNIVERSITIES);
}

function renderUniversityOptions(universities) {
    const selects = [
        document.getElementById("universitySelect"),
        document.getElementById("regUniversitySelect")
    ];

    selects.forEach(selectElem => {
        if (!selectElem) return;
        universities.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.university_id;
            const addrInfo = u.address ? ` - ${u.address}` : ` - ${u.city || 'Ahmedabad'}`;
            opt.textContent = `${u.name}${addrInfo}`;
            selectElem.appendChild(opt);
        });
    });
}

// Switch Authentication Mode: 'login' or 'register'
function setAuthMode(mode) {
    currentMode = mode;
    clearAlert();

    const formLogin = document.getElementById("loginForm");
    const formReg = document.getElementById("registerForm");

    if (mode === "register") {
        formLogin.style.display = "none";
        formReg.style.display = "block";
    } else {
        formLogin.style.display = "block";
        formReg.style.display = "none";
    }

    // Refresh role UI for the current mode
    switchRole(currentRole);
}

// Switch user role (Student, Canteen Staff, NGO)
function switchRole(role) {
    currentRole = role;

    // Update active tab buttons
    document.getElementById("tabStudent").classList.toggle("active", role === "student");
    document.getElementById("tabStaff").classList.toggle("active", role === "canteen_staff");
    document.getElementById("tabNgo").classList.toggle("active", role === "ngo");

    clearAlert();

    // 1. Adjust Login Form view
    const univGroup = document.getElementById("universityGroup");
    const univSelect = document.getElementById("universitySelect");
    const idLabel = document.getElementById("identifierLabel");
    const idInput = document.getElementById("identifierInput");
    const btnText = document.getElementById("btnText");

    if (role === "ngo") {
        if (univGroup) univGroup.style.display = "none";
        if (univSelect) univSelect.removeAttribute("required");
        if (idLabel) idLabel.innerHTML = `<i class="fa-solid fa-building-ngo"></i> NGO Registration No. or Email`;
        if (idInput) idInput.placeholder = "e.g., RHA-BLR-2018-9901 or contact@ngo.org";
        if (btnText) btnText.textContent = "Sign In as NGO Partner";
    } else if (role === "canteen_staff") {
        if (univGroup) univGroup.style.display = "block";
        if (univSelect) univSelect.setAttribute("required", "true");
        if (idLabel) idLabel.innerHTML = `<i class="fa-solid fa-id-badge"></i> Staff ID or College Email`;
        if (idInput) idInput.placeholder = "e.g., ramesh.canteen@nit.edu or STAFF-NIT-019";
        if (btnText) btnText.textContent = "Sign In as Canteen Staff";
    } else {
        if (univGroup) univGroup.style.display = "block";
        if (univSelect) univSelect.setAttribute("required", "true");
        if (idLabel) idLabel.innerHTML = `<i class="fa-solid fa-id-card"></i> Student ID or College Email`;
        if (idInput) idInput.placeholder = "e.g., aarav.sharma@nit.edu or NIT2024CS042";
        if (btnText) btnText.textContent = "Sign In to Campus Food Portal";
    }

    // 2. Adjust Registration Form view
    const regUnivGroup = document.getElementById("regUniversityGroup");
    const regUnivSelect = document.getElementById("regUniversitySelect");
    const regCampusFields = document.getElementById("regCampusFields");
    const regNgoFields = document.getElementById("regNgoFields");
    const regCampusIdLabel = document.getElementById("regCampusIdLabel");
    const regCampusId = document.getElementById("regCampusId");
    const regBtnText = document.getElementById("regBtnText");

    const regFullName = document.getElementById("regFullName");
    const regPhone = document.getElementById("regPhone");
    const regEmail = document.getElementById("regEmail");
    const regNgoName = document.getElementById("regNgoName");
    const regNgoRegNo = document.getElementById("regNgoRegNo");
    const regNgoContact = document.getElementById("regNgoContact");
    const regNgoPhone = document.getElementById("regNgoPhone");
    const regNgoEmail = document.getElementById("regNgoEmail");
    const regNgoCity = document.getElementById("regNgoCity");

    if (role === "ngo") {
        if (regUnivGroup) regUnivGroup.style.display = "none";
        if (regUnivSelect) regUnivSelect.removeAttribute("required");
        if (regCampusFields) regCampusFields.style.display = "none";
        if (regNgoFields) regNgoFields.style.display = "block";

        if (regFullName) regFullName.removeAttribute("required");
        if (regPhone) regPhone.removeAttribute("required");
        if (regEmail) regEmail.removeAttribute("required");

        if (regNgoName) regNgoName.setAttribute("required", "true");
        if (regNgoRegNo) regNgoRegNo.setAttribute("required", "true");
        if (regNgoContact) regNgoContact.setAttribute("required", "true");
        if (regNgoPhone) regNgoPhone.setAttribute("required", "true");
        if (regNgoEmail) regNgoEmail.setAttribute("required", "true");
        if (regNgoCity) regNgoCity.setAttribute("required", "true");

        if (regBtnText) regBtnText.textContent = "Register NGO & Connect with Campuses";
    } else {
        if (regUnivGroup) regUnivGroup.style.display = "block";
        if (regUnivSelect) regUnivSelect.setAttribute("required", "true");
        if (regCampusFields) regCampusFields.style.display = "block";
        if (regNgoFields) regNgoFields.style.display = "none";

        if (regFullName) regFullName.setAttribute("required", "true");
        if (regPhone) regPhone.setAttribute("required", "true");
        if (regEmail) regEmail.setAttribute("required", "true");

        if (regNgoName) regNgoName.removeAttribute("required");
        if (regNgoRegNo) regNgoRegNo.removeAttribute("required");
        if (regNgoContact) regNgoContact.removeAttribute("required");
        if (regNgoPhone) regNgoPhone.removeAttribute("required");
        if (regNgoEmail) regNgoEmail.removeAttribute("required");
        if (regNgoCity) regNgoCity.removeAttribute("required");

        if (role === "canteen_staff") {
            if (regCampusIdLabel) regCampusIdLabel.innerHTML = `<i class="fa-solid fa-id-badge"></i> Staff ID / Mess Code`;
            if (regCampusId) regCampusId.placeholder = "e.g. STAFF-MESS-07";
            if (regBtnText) regBtnText.textContent = "Create Canteen Account & Enter Portal";
        } else {
            if (regCampusIdLabel) regCampusIdLabel.innerHTML = `<i class="fa-solid fa-id-card"></i> Student Roll No / ID`;
            if (regCampusId) regCampusId.placeholder = "e.g. NIT2025CS110";
            if (regBtnText) regBtnText.textContent = "Create Student Account & Enter Portal";
        }
    }
}

// Toggle password visibility helper
function togglePasswordVisibility(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const eyeIcon = document.getElementById(iconId);
    if (!passwordInput || !eyeIcon) return;

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.classList.remove("fa-eye");
        eyeIcon.classList.add("fa-eye-slash");
    } else {
        passwordInput.type = "password";
        eyeIcon.classList.remove("fa-eye-slash");
        eyeIcon.classList.add("fa-eye");
    }
}

// Handle Form Submission: Login
async function handleLogin(e) {
    e.preventDefault();
    clearAlert();

    const univVal = document.getElementById("universitySelect").value;
    const universityId = (univVal && univVal !== "") ? parseInt(univVal) : null;
    const identifier = document.getElementById("identifierInput").value.trim();
    const password = document.getElementById("passwordInput").value.trim();
    const submitBtn = document.getElementById("submitBtn");

    if (!identifier || !password) {
        showAlert("Please provide both your ID/Email and password.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Authenticating...`;

    try {
        const payload = {
            role: currentRole,
            university_id: currentRole === "ngo" ? null : universityId,
            identifier: identifier,
            password: password
        };

        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            handleLoginSuccess(data.user);
            return;
        } else {
            const err = await response.json();
            throw new Error(err.detail || "Invalid login credentials.");
        }
    } catch (err) {
        console.warn("Backend API request returned error or offline:", err.message);
        const isNetworkErr = err.name === "TypeError" || (err.message && err.message.toLowerCase().includes("fetch"));
        if (isNetworkErr) {
            // Check if matches fallback accounts for offline resilience
            const matchedKey = Object.keys(FALLBACK_ACCOUNTS).find(k => {
                const acc = FALLBACK_ACCOUNTS[k];
                return acc.role === currentRole &&
                       acc.identifier.toLowerCase() === identifier.toLowerCase() &&
                       acc.password === password &&
                       (currentRole === "ngo" || !universityId || acc.university_id == universityId);
            });

            if (matchedKey) {
                const fallbackAcc = FALLBACK_ACCOUNTS[matchedKey];
                const fallbackUser = {
                    user_id: matchedKey === "ngo_rha" ? 1 : (matchedKey === "canteen_nirma" ? 2 : 1),
                    ngo_id: matchedKey === "ngo_rha" ? 1 : null,
                    name: matchedKey === "ngo_rha" ? "Robin Hood Army Ahmedabad" : (matchedKey === "canteen_nirma" ? "Dharmik Modha (Canteen)" : "Rushirajsinh Vala"),
                    email: fallbackAcc.identifier,
                    role: fallbackAcc.role,
                    university_id: fallbackAcc.university_id,
                    university_name: fallbackAcc.university_id === 1 ? "Nirma University" : (fallbackAcc.university_id === 2 ? "Adani University" : null),
                    university_address: fallbackAcc.university_id === 1 ? "Sarkhej - Gandhinagar Highway, Gota" : (fallbackAcc.university_id === 2 ? "Shantigram Township, SG Highway" : null),
                    address: matchedKey === "ngo_rha" ? "SG Highway Distribution Hub, Bodakdev" : null,
                    pincode: matchedKey === "ngo_rha" ? "380054" : "382481",
                    state: "Gujarat",
                    city: "Ahmedabad"
                };
                showAlert("Connecting in offline mode...", "success");
                handleLoginSuccess(fallbackUser);
                return;
            }
            showAlert("⚠️ Cannot connect to FastAPI server (http://127.0.0.1:8000). Please double-click 'run_server.bat' to launch the web backend.", "error");
        } else {
            showAlert(err.message, "error");
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Sign In</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
}

// Handle Form Submission: New User Registration
async function handleRegister(e) {
    e.preventDefault();
    clearAlert();

    const regBtn = document.getElementById("regSubmitBtn");
    const password = document.getElementById("regPassword").value.trim();
    const confirmPassword = document.getElementById("regConfirmPassword").value.trim();

    if (password !== confirmPassword) {
        showAlert("Passwords do not match. Please verify and try again.", "error");
        return;
    }

    if (password.length < 4) {
        showAlert("Password must be at least 4 characters long.", "error");
        return;
    }

    let payload = {
        role: currentRole,
        password: password
    };

    if (currentRole in { student: 1, canteen_staff: 1 }) {
        const univId = document.getElementById("regUniversitySelect").value;
        const fullName = document.getElementById("regFullName").value.trim();
        const phone = document.getElementById("regPhone").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const campusId = document.getElementById("regCampusId").value.trim();

        if (!univId) {
            showAlert("Please select your university.", "error");
            return;
        }
        if (!fullName || !email) {
            showAlert("Full name and email are required.", "error");
            return;
        }

        payload.university_id = parseInt(univId);
        payload.full_name = fullName;
        payload.email = email;
        payload.phone = phone;
        payload.student_or_staff_id = campusId;
    } else {
        // NGO Registration
        const ngoName = document.getElementById("regNgoName").value.trim();
        const regNo = document.getElementById("regNgoRegNo").value.trim();
        const contactPerson = document.getElementById("regNgoContact").value.trim();
        const phone = document.getElementById("regNgoPhone").value.trim();
        const email = document.getElementById("regNgoEmail").value.trim();
        const city = document.getElementById("regNgoCity").value.trim();
        const state = document.getElementById("regNgoState").value.trim();
        const pincode = document.getElementById("regNgoPincode").value.trim();
        const address = document.getElementById("regNgoAddress").value.trim();

        if (!ngoName || !regNo || !email) {
            showAlert("NGO Name, Registration Number, and Email are required.", "error");
            return;
        }

        payload.ngo_name = ngoName;
        payload.registration_number = regNo;
        payload.contact_person = contactPerson;
        payload.phone = phone;
        payload.email = email;
        payload.city = city;
        payload.state = state;
        payload.pincode = pincode;
        payload.address = address;
    }

    regBtn.disabled = true;
    regBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Creating Account...`;

    try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            showAlert(`Registration successful! Welcome to BiteShare. Redirecting...`, "success");
            handleLoginSuccess(data.user);
            return;
        } else {
            const err = await response.json();
            throw new Error(err.detail || "Registration failed. Please check inputs.");
        }
    } catch (err) {
        console.error("Registration error:", err);
        showAlert(err.message, "error");
    } finally {
        regBtn.disabled = false;
        regBtn.innerHTML = `<span>Submit</span> <i class="fa-solid fa-user-check"></i>`;
    }
}

// Successful login or registration handler
function handleLoginSuccess(user) {
    localStorage.setItem("biteshare_user", JSON.stringify(user));
    localStorage.setItem("kindplates_user", JSON.stringify(user));
    localStorage.setItem("foodbridge_user", JSON.stringify(user));
    showAlert(`Welcome, ${user.name || "User"}! Authentication successful. Redirecting to your dashboard...`, "success");

    setTimeout(() => {
        if (user.role === "ngo") {
            window.location.href = "ngo-dashboard.html";
        } else if (user.role === "canteen_staff") {
            window.location.href = "canteen-dashboard.html";
        } else {
            window.location.href = "student-dashboard.html";
        }
    }, 900);
}

function showAlert(message, type) {
    const box = document.getElementById("alertBox");
    if (!box) return;
    box.textContent = message;
    box.className = `alert-box ${type}`;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearAlert() {
    const box = document.getElementById("alertBox");
    if (!box) return;
    box.className = "alert-box";
    box.textContent = "";
}
