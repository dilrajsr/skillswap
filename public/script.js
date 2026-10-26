// ===== SkillSwap shared script.js =====
// This file is loaded on every page.
// It holds helper functions for talking to the server (the /api routes),
// the logged-in user, connections, and nav setup.
// All data now lives on the server - the browser only keeps a login cookie.

// ----- Talking to the server -----

// pages that can be opened without logging in
const PUBLIC_PAGES = ["", "index.html", "login.html", "register.html"];

// Sends a request to the server and gives back { status, data }.
// If the login has expired (401) on a page that needs login, go to the login page.
async function api(url, method, body) {
    let options = { method: method || "GET", headers: {} };
    if (body instanceof FormData) {
        // file upload - the browser sets the multipart header by itself
        options.body = body;
    } else if (body) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    let response = await fetch(url, options);
    let data = {};
    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    let page = window.location.pathname.split("/").pop();
    if (response.status === 401 && !PUBLIC_PAGES.includes(page)) {
        window.location.href = "login.html";
    }
    return { status: response.status, data: data };
}

// user text is shown with innerHTML in many places, so special characters are escaped first
function esc(text) {
    return String(text === undefined || text === null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// round profile picture, or the first letter of the name if there is no picture
function avatarHtml(person, size) {
    size = size || 56;
    let style = `width:${size}px; height:${size}px;`;
    if (person.pictureUrl) {
        return `<img class="avatar" src="${esc(person.pictureUrl)}" alt="${esc(person.name)}" style="${style}">`;
    }
    let letter = esc((person.name || "?").charAt(0).toUpperCase());
    return `<div class="avatar avatar-placeholder" style="${style} font-size:${Math.round(size / 2)}px;">${letter}</div>`;
}

// ----- User Helper Functions -----
// One email address can have BOTH a Teacher profile and a Learner profile.
// Every profile has its own unique "id".
// The server knows who is logged in from the login cookie (JWT).

async function getCurrentUser() {
    let result = await api("/api/me");
    if (result.status !== 200) return null;
    return result.data;
}

async function logout() {
    await api("/api/logout", "POST");
    window.location.href = "login.html";
}

// returns the logged in user, or sends the visitor to the login page
async function requireLogin() {
    let user = await getCurrentUser();
    if (!user) {
        window.location.href = "login.html";
    }
    return user;
}

// ----- Tutor / Learner Helper Functions -----
// Anyone who registers a Teacher profile automatically becomes a tutor that
// learners can find, even before they add any skills.

async function getTutors() {
    let result = await api("/api/tutors");
    return result.status === 200 ? result.data : [];
}

// ----- Connection Helper Functions -----
// A "connection" represents a live session between one Learner and one
// Teacher: it starts as a request ("pending") and becomes "active" when the teacher accepts.

async function getConnections() {
    let result = await api("/api/connections");
    return result.status === 200 ? result.data : [];
}

// The drop-down with the tutor's skills + the "Get Connected" button.
// The learner has to choose one skill, then the request goes to the teacher.
function connectBoxHtml(tutor) {
    let hasSkills = tutor.teachSkills.length > 0;
    let options = tutor.teachSkills.map((skill) => `<option value="${esc(skill)}">${esc(skill)}</option>`).join("");
    return `
        <div class="connect-box">
            <select class="skill-select" ${hasSkills ? "" : "disabled"}>
                <option value="">${hasSkills ? "Choose a skill..." : "No skills listed yet"}</option>
                ${options}
            </select>
            <button class="btn btn-primary connectBtn" ${hasSkills ? "" : "disabled"}>Get Connected</button>
        </div>
    `;
}

// makes the button inside a connect box work (call after the html is on the page)
function setupConnectBox(container, tutor) {
    let select = container.querySelector(".skill-select");
    let button = container.querySelector(".connectBtn");
    button.addEventListener("click", () => {
        if (select.value === "") {
            alert("Please choose a skill first.");
            return;
        }
        startConnection(tutor, select.value);
    });
}

// Called when a learner chooses a skill and clicks "Get Connected" on a tutor.
// This sends a request - the teacher has to accept it before the session starts.
async function startConnection(tutor, skill) {
    let user = await getCurrentUser();
    if (!user) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    if (user.role !== "learner") {
        alert("Only learners can connect with a tutor.");
        return;
    }

    let result = await api("/api/connections", "POST", { tutorId: tutor.id, skill: skill });

    if (result.status === 201) {
        window.location.href = "chat.html";
    } else if (result.data.busy) {
        alert("You already have an active session or a waiting request. Redirecting you to it.");
        window.location.href = "chat.html";
    } else {
        alert(result.data.message || "Could not connect.");
    }
}

// ----- Nav Highlight + Login/Logout Link + Role-based Nav Items -----

async function setupNav() {
    let page = window.location.pathname.split("/").pop();
    let links = document.querySelectorAll(".nav-links a");

    links.forEach((link) => {
        if (link.getAttribute("href") === page) {
            link.classList.add("active");
        }
    });

    let authLink = document.getElementById("authLink");
    let skillsNavLink = document.getElementById("skillsNavLink");
    let findTutorNavLink = document.getElementById("findTutorNavLink");

    let user = await getCurrentUser();

    if (authLink) {
        if (user) {
            authLink.innerHTML = `<a href="#" id="logoutBtn">Logout (${esc(user.name)} - ${esc(user.role)})</a>`;
            document.getElementById("logoutBtn").addEventListener("click", (e) => {
                e.preventDefault();
                logout();
            });
        } else {
            authLink.innerHTML = `<a href="login.html">Login</a>`;
        }
    }

    // Teachers see "Find Student" instead of "Find Tutor" everywhere (nav, buttons, footer)
    if (user && user.role === "teacher") {
        document.querySelectorAll('a[href="find-tutor.html"]').forEach((link) => {
            link.textContent = link.textContent.replace("Tutor", "Student");
        });
    }

    // Learners see "Find Tutor", Teachers see "Teaching" (same Skills page,
    // just relabeled) and "Find Student", Admins see neither.
    if (user && skillsNavLink && findTutorNavLink) {
        if (user.role === "teacher") {
            skillsNavLink.style.display = "list-item";
            skillsNavLink.querySelector("a").textContent = "Teaching";
            findTutorNavLink.style.display = "list-item";
        } else if (user.role === "learner") {
            skillsNavLink.style.display = "list-item";
            skillsNavLink.querySelector("a").textContent = "Skills";
            findTutorNavLink.style.display = "list-item";
        } else if (user.role === "admin") {
            skillsNavLink.style.display = "none";
            findTutorNavLink.style.display = "none";
        }
    }
}

document.addEventListener("DOMContentLoaded", setupNav);
