/**
 * SkillSwap - Spacious Studio Navigation Component
 * Uncluttered, breathable layout with relocated secondary items into a sleek Profile Overlay Drawer.
 */

function renderNavbar() {
  const currentUser = window.SkillSwapStorage.getCurrentUser();
  const allUsers = window.SkillSwapStorage.getUsers();
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  // Calculate user's current coins safely
  const userCoins = currentUser ? (currentUser.coins ?? (window.SkillSwapStorage.getCoinBalance ? window.SkillSwapStorage.getCoinBalance(currentUser.id) : 0)) : 0;
  const initials = currentUser ? currentUser.name.split(" ").map(n => n[0]).join("") : "U";

  const navHtml = `
    <header class="skillswap-header">
      <nav class="nav-container">
        <!-- 1. Distinct Brand Wordmark -->
        <a href="index.html" class="brand" title="SkillSwap — Peer-to-Peer Reciprocal Knowledge Barter">
          <div class="brand-icon" aria-hidden="true">⇄</div>
          <div class="brand-title">
            Skill<span>Swap</span>
          </div>
        </a>

        <!-- 2. Clean, Focused Primary Navigation (Only 4 core destinations) -->
        <ul class="nav-menu" id="primaryNavMenu">
          <li><a href="index.html" class="nav-link ${currentPath === 'index.html' ? 'active' : ''}">Overview</a></li>
          <li><a href="find-tutor.html" class="nav-link ${currentPath === 'find-tutor.html' ? 'active' : ''}">Matches</a></li>
          <li><a href="shelf.html" class="nav-link ${currentPath === 'shelf.html' ? 'active' : ''}">Disciplines</a></li>
          <li><a href="sessions.html" class="nav-link ${currentPath === 'sessions.html' ? 'active' : ''}">Sessions</a></li>
        </ul>

        <!-- 3. Right Action Cluster: Coin Pill & Profile Menu -->
        <div class="nav-actions">
          ${currentUser ? `
            <!-- Live Coin Pill -->
            <a href="coins.html" class="badge badge-coin" title="Your Skill Coin balance (earned via confirmed sessions)">
              <span style="font-size: 13px;">🪙</span>
              <span class="tabular-nums" style="font-weight: 700;">${userCoins}</span>
            </a>

            <!-- Member Profile Avatar Trigger -->
            <div class="profile-menu-wrapper" style="position: relative;">
              <button type="button" class="profile-menu-trigger" id="profileMenuToggle" aria-label="Open member studio menu" aria-expanded="false">
                <div class="user-avatar" style="width: 34px; height: 34px; font-size: 13px; background: ${currentUser.avatarColor || '#e07a5f'};">
                  ${initials}
                </div>
                <span class="profile-name-short">${currentUser.name.split(" ")[0]}</span>
                <span class="profile-caret">▾</span>
              </button>

              <!-- Relocated Options Dropdown Panel -->
              <div class="profile-dropdown-panel" id="profileDropdownPanel">
                <div class="dropdown-header">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-avatar" style="width: 38px; height: 38px; font-size: 14px; background: ${currentUser.avatarColor || '#e07a5f'};">
                      ${initials}
                    </div>
                    <div>
                      <div style="font-weight: 700; font-size: 14px; color: var(--text);">${currentUser.name}</div>
                      <div style="font-size: 11.5px; color: var(--text-faint);">${currentUser.email}</div>
                    </div>
                  </div>
                  <div style="margin-top: 8px; font-size: 11px; color: var(--accent-seek); font-family: var(--font-mono);">
                    ${currentUser.role.toUpperCase()} &bull; ${currentUser.reputation} ★ REPUTATION
                  </div>
                </div>

                <div class="dropdown-section">
                  <div class="dropdown-section-label">STUDIO WORKSPACE</div>
                  <a href="dashboard.html" class="dropdown-item ${currentPath === 'dashboard.html' ? 'active' : ''}">
                    <span>📊</span> Dashboard &amp; Activity
                  </a>
                  <a href="skills.html" class="dropdown-item ${currentPath === 'skills.html' ? 'active' : ''}">
                    <span>⚡</span> Skills Matrix (Give/Seek)
                  </a>
                  <a href="chat.html" class="dropdown-item ${currentPath === 'chat.html' ? 'active' : ''}">
                    <span>💬</span> Live 1-on-1 Room
                  </a>
                  <a href="coins.html" class="dropdown-item ${currentPath === 'coins.html' ? 'active' : ''}">
                    <span>🪙</span> Economy &amp; Coin Ledger
                  </a>
                  <a href="profile.html" class="dropdown-item ${currentPath === 'profile.html' ? 'active' : ''}">
                    <span>👤</span> Profile &amp; Endorsements
                  </a>
                </div>

                <div class="dropdown-section">
                  <div class="dropdown-section-label">SWITCH DEMO PERSONA</div>
                  <select id="dropdownPersonaSelect" class="dropdown-persona-select" aria-label="Switch active test persona">
                    ${allUsers.map(u => `
                      <option value="${u.id}" ${currentUser.id === u.id ? 'selected' : ''}>
                        ${u.name} (${u.role})
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="dropdown-footer">
                  <button type="button" class="btn btn-ghost btn-sm" id="dropdownLogoutBtn" style="width: 100%; justify-content: center; color: var(--negative);">
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          ` : `
            <a href="login.html" class="btn btn-secondary btn-sm">Sign in</a>
            <a href="register.html" class="btn btn-primary btn-sm">Join</a>
          `}

          <!-- Mobile Hamburger Toggle -->
          <button 
            type="button" 
            class="btn btn-ghost btn-sm" 
            id="mobileMenuToggle" 
            aria-label="Toggle navigation menu"
            style="display: none; padding: 6px;"
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  `;

  // Insert at top of body
  const existingHeader = document.querySelector("header.skillswap-header") || document.querySelector("header");
  if (existingHeader) existingHeader.remove();
  document.body.insertAdjacentHTML("afterbegin", navHtml);

  // Wire profile dropdown toggle
  const profileToggle = document.getElementById("profileMenuToggle");
  const dropdownPanel = document.getElementById("profileDropdownPanel");

  if (profileToggle && dropdownPanel) {
    profileToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdownPanel.classList.toggle("open");
      profileToggle.setAttribute("aria-expanded", isOpen);
    });

    document.addEventListener("click", (e) => {
      if (!dropdownPanel.contains(e.target) && !profileToggle.contains(e.target)) {
        dropdownPanel.classList.remove("open");
        profileToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Wire persona switcher inside dropdown
  document.getElementById("dropdownPersonaSelect")?.addEventListener("change", (e) => {
    window.SkillSwapEngine.switchDemoUser(e.target.value);
  });

  // Wire logout
  document.getElementById("dropdownLogoutBtn")?.addEventListener("click", () => {
    window.SkillSwapStorage.logout();
    window.location.href = "login.html";
  });

  // Wire mobile menu toggle
  const mobileToggle = document.getElementById("mobileMenuToggle");
  const primaryMenu = document.getElementById("primaryNavMenu");
  if (window.innerWidth <= 768 && mobileToggle) {
    mobileToggle.style.display = "inline-flex";
  }
  mobileToggle?.addEventListener("click", () => {
    primaryMenu?.classList.toggle("mobile-open");
  });
}

// Auto-initialize navbar on all pages including nav.js
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      renderNavbar();
    });
  } else {
    renderNavbar();
  }
}
