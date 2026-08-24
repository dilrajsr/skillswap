// ===== SkillSwap shared script.js =====
// This file is loaded on every page.
// It holds helper functions for users, tutors, connections, and nav setup.

// ----- User Helper Functions -----
// NOTE: one email address can now have BOTH a Teacher profile and a Learner
// profile (they are stored as two separate objects in "users"). Because of
// this, email is no longer a unique key - every profile gets its own unique
// "id" instead, and that id is what we use to look profiles up.

function getUsers() {
    return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
}

function getCurrentUser() {
    // sessionStorage is unique per browser tab, so two tabs can be logged
    // into two different profiles at the same time (e.g. a Teacher profile
    // in one tab and a Learner profile in another). This is the same
    // session-storage approach as before - it just now stores a profile id
    // instead of an email, since email alone can no longer identify one profile.
    let id = sessionStorage.getItem("currentUserId");
    if (!id) return null;

    // the admin account is hardcoded and never stored in localStorage
    if (id === ADMIN_USER.id) return { ...ADMIN_USER };

    let users = getUsers();
    return users.find(u => u.id === id);
}

function updateCurrentUser(updatedUser) {
    // the admin account is hardcoded and cannot be changed by anyone
    if (updatedUser.id === ADMIN_USER.id) return;

    let users = getUsers();
    for (let i = 0; i < users.length; i++) {
        if (users[i].id === updatedUser.id) {
            users[i] = updatedUser;
        }
    }
    saveUsers(users);
}

function logout() {
    sessionStorage.removeItem("currentUserId");
    window.location.href = "login.html";
}

function requireLogin() {
    let user = getCurrentUser();
    if (!user) {
        alert("Please login first.");
        window.location.href = "login.html";
    }
    return user;
}

// ----- Hardcoded Admin Account -----

const ADMIN_USER = {
    id: "admin-001",
    name: "Admin",
    email: "admin@skillswap.com",
    password: "admin123",
    role: "admin",
    bio: "",
    teachSkills: [],
    learnSkills: [],
    coins: 0,
    reputation: 5,
    coinHistory: []
};

// ----- Tutor Helper Function -----
// Anyone who registers a Teacher profile automatically becomes a tutor that
// learners can find, even before they add any skills.
function getTutors() {
    let users = getUsers();
    return users.filter(u => u.role === "teacher");
}

// ----- Learner Helper Function -----
// Anyone who registers a Learner profile appears in the learner rankings.
function getLearners() {
    let users = getUsers();
    return users.filter(u => u.role === "learner");
}

// ----- Connection Helper Functions -----
// A "connection" represents a live session between one Learner and one
// Teacher: just a status of "active" or "ended" that both tabs can see.

function getConnections() {
    return JSON.parse(localStorage.getItem("connections")) || [];
}

function saveConnections(connections) {
    localStorage.setItem("connections", JSON.stringify(connections));
}

// Called when a learner clicks "Get Connected" on a tutor.
function startConnection(tutor) {
    let user = getCurrentUser();
    if (!user) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    if (user.role !== "learner") {
        alert("Only learners can connect with a tutor.");
        return;
    }

    let connections = getConnections();

    let learnerBusy = connections.some(c => c.learnerId === user.id && c.status === "active");
    if (learnerBusy) {
        alert("You are already in an active session. Redirecting you to it.");
        window.location.href = "chat.html";
        return;
    }

    let tutorBusy = connections.some(c => c.teacherId === tutor.id && c.status === "active");
    if (tutorBusy) {
        alert("This tutor is currently in another session. Please try again soon.");
        return;
    }

    let newConnection = {
        id: Date.now().toString() + Math.floor(Math.random() * 1000),
        teacherId: tutor.id,
        teacherName: tutor.name,
        teacherEmail: tutor.email,
        learnerId: user.id,
        learnerName: user.name,
        learnerEmail: user.email,
        skill: tutor.teachSkills.length > 0 ? tutor.teachSkills.join(", ") : "General",
        status: "active",
        startedAt: new Date().toLocaleString(),
        endedAt: null
    };

    connections.push(newConnection);
    saveConnections(connections);

    window.location.href = "chat.html";
}

// ----- Nav Highlight + Login/Logout Link + Role-based Nav Items -----

function setupNav() {
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

    let user = getCurrentUser();

    if (authLink) {
        if (user) {
            authLink.innerHTML = `<a href="#" id="logoutBtn">Logout (${user.name} - ${user.role})</a>`;
            document.getElementById("logoutBtn").addEventListener("click", (e) => {
                e.preventDefault();
                logout();
            });
        } else {
            authLink.innerHTML = `<a href="login.html">Login</a>`;
        }
    }

    // Learners see "Find Tutor", Teachers see "Teaching" (same Skills page,
    // just relabeled), Admins see neither.
    if (user && skillsNavLink && findTutorNavLink) {
        if (user.role === "teacher") {
            skillsNavLink.style.display = "list-item";
            skillsNavLink.querySelector("a").textContent = "Teaching";
            findTutorNavLink.style.display = "none";
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
