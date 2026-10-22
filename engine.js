/**
 * SkillSwap - Core Business Engine
 * Implements:
 * 1. Bidirectional Reciprocal Match Engine & Scoring
 * 2. Explicit Swap State Machine with legal transitions & ownership checks
 * 3. Idempotency Key tracking
 * 4. Auth & Session Management
 * 5. Toast & UI feedback utilities
 */

class AppError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

class BusinessEngine {
  constructor(storage) {
    this.storage = storage;
    this.processedIdempotencyKeys = new Set();
  }

  // ==========================================
  // 1. BIDIRECTIONAL MATCH ENGINE
  // ==========================================
  /**
   * Evaluates bidirectional reciprocity between the current user and all other registered members.
   * A mutual match occurs when:
   * (A.offers IN B.wants) AND (B.offers IN A.wants)
   */
  findMatchesForUser(currentUserId) {
    const currentUser = this.storage.getUserById(currentUserId);
    if (!currentUser) return [];

    const allSkills = this.storage.getUserSkills();
    const myOffers = allSkills.filter(s => s.userId === currentUserId && s.type === "OFFER");
    const myWants = allSkills.filter(s => s.userId === currentUserId && s.type === "WANT");

    const otherUsers = this.storage.getUsers().filter(u => u.id !== currentUserId && u.role !== "admin");

    const matches = otherUsers.map(otherUser => {
      const theirOffers = allSkills.filter(s => s.userId === otherUser.id && s.type === "OFFER");
      const theirWants = allSkills.filter(s => s.userId === otherUser.id && s.type === "WANT");

      // Finding overlaps:
      // 1. I teach what they want
      const iCanTeachThem = myOffers.filter(myOffer =>
        theirWants.some(theirWant => this._isSkillMatch(myOffer.skillName, theirWant.skillName))
      );

      // 2. They teach what I want
      const theyCanTeachMe = theirOffers.filter(theirOffer =>
        myWants.some(myWant => this._isSkillMatch(theirOffer.skillName, myWant.skillName))
      );

      const isMutual = iCanTeachThem.length > 0 && theyCanTeachMe.length > 0;
      const isOneWay = !isMutual && (iCanTeachThem.length > 0 || theyCanTeachMe.length > 0);

      // Scoring Algorithm
      let score = 0;
      const scoreBreakdown = [];

      if (isMutual) {
        score += 55;
        scoreBreakdown.push({ label: "Mutual Reciprocal Match", pts: "+55" });

        // Extra overlapping skills bonus
        const extraSkills = (iCanTeachThem.length - 1) + (theyCanTeachMe.length - 1);
        if (extraSkills > 0) {
          const extraPts = Math.min(extraSkills * 10, 15);
          score += extraPts;
          scoreBreakdown.push({ label: `Multi-skill Alignment (${extraSkills} extra)`, pts: `+${extraPts}` });
        }
      } else if (isOneWay) {
        score += 25;
        scoreBreakdown.push({ label: "One-Way Mentor/Learner Alignment", pts: "+25" });
      } else {
        score += 10;
        scoreBreakdown.push({ label: "Platform Community Base", pts: "+10" });
      }

      // Timezone proximity bonus
      const tzMatch = this._checkTimezoneOverlap(currentUser.timezone, otherUser.timezone);
      if (tzMatch) {
        score += 15;
        scoreBreakdown.push({ label: "Timezone Friendly", pts: "+15" });
      }

      // Reputation / Rating weight
      const repWeight = Math.round((otherUser.reputation || 5.0) * 3);
      score += repWeight;
      scoreBreakdown.push({ label: `High Reputation (${otherUser.reputation} / 5.0)`, pts: `+${repWeight}` });

      score = Math.min(score, 100);

      // Build readable "Why you matched" explanation
      let explanation = "";
      if (isMutual) {
        const mySkill = iCanTeachThem[0].skillName;
        const theirSkill = theyCanTeachMe[0].skillName;
        explanation = `You teach ${mySkill} (they want) ↔ They teach ${theirSkill} (you want). Perfect 2-way exchange!`;
      } else if (iCanTeachThem.length > 0) {
        explanation = `You offer ${iCanTeachThem[0].skillName} which they are eager to learn.`;
      } else if (theyCanTeachMe.length > 0) {
        explanation = `They offer ${theyCanTeachMe[0].skillName} which is in your learning goals.`;
      } else {
        explanation = `Explore shared knowledge exchange and open up new skill requests.`;
      }

      return {
        user: otherUser,
        matchScore: score,
        isMutual,
        iCanTeachThem,
        theyCanTeachMe,
        allTheirOffers: theirOffers,
        allTheirWants: theirWants,
        scoreBreakdown,
        explanation
      };
    });

    // Rank descending by match score
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  _isSkillMatch(skillA, skillB) {
    if (!skillA || !skillB) return false;
    const a = skillA.toLowerCase().trim();
    const b = skillB.toLowerCase().trim();
    return a === b || a.includes(b) || b.includes(a);
  }

  _checkTimezoneOverlap(tzA, tzB) {
    if (!tzA || !tzB) return false;
    return tzA === tzB || (tzA.includes("UTC-5") && tzB.includes("UTC-8"));
  }

  // ==========================================
  // 2. SWAP STATE MACHINE & CONCURRENCY
  // ==========================================
  /**
   * Legal Transitions:
   * PENDING  -> ACCEPTED | DECLINED | CANCELLED
   * ACCEPTED -> COMPLETED | CANCELLED
   */
  canTransition(fromStatus, toStatus, actorId, swap) {
    if (fromStatus === toStatus) return false;

    const isRequester = swap.requesterId === actorId;
    const isRecipient = swap.recipientId === actorId;

    if (!isRequester && !isRecipient) {
      return { allowed: false, reason: "IDOR_FORBIDDEN: You are not a participant in this swap." };
    }

    if (fromStatus === "PENDING") {
      if (toStatus === "ACCEPTED") {
        if (!isRecipient) return { allowed: false, reason: "Only the recipient can accept a pending swap request." };
        return { allowed: true };
      }
      if (toStatus === "DECLINED") {
        if (!isRecipient) return { allowed: false, reason: "Only the recipient can decline a pending swap request." };
        return { allowed: true };
      }
      if (toStatus === "CANCELLED") {
        if (!isRequester) return { allowed: false, reason: "Only the requester can cancel a pending swap." };
        return { allowed: true };
      }
    }

    if (fromStatus === "ACCEPTED") {
      if (toStatus === "COMPLETED") {
        return { allowed: true }; // Either participant can mark complete once teaching occurred
      }
      if (toStatus === "CANCELLED") {
        return { allowed: true }; // Either can cancel an accepted scheduled swap
      }
    }

    return { allowed: false, reason: `Illegal state transition from ${fromStatus} to ${toStatus}.` };
  }

  /**
   * Executes a state transition atomically with validations
   */
  transitionSwap(swapId, targetStatus, actorId, extraData = {}) {
    const swap = this.storage.getSwapById(swapId);
    if (!swap) throw new AppError("Swap not found", "NOT_FOUND", 404);

    const check = this.canTransition(swap.status, targetStatus, actorId, swap);
    if (!check.allowed) {
      throw new AppError(check.reason, "CONFLICT_STATE_TRANSITION", 409);
    }

    // Prepare updates
    const updates = {
      status: targetStatus,
      ...extraData
    };

    // If accepting, ensure scheduled time is saved or defaulted
    if (targetStatus === "ACCEPTED" && !swap.scheduledAt && !extraData.scheduledAt) {
      updates.scheduledAt = new Date(Date.now() + 86400000).toISOString(); // Default tomorrow
    }

    // Atomic update
    const updatedSwap = this.storage.updateSwap(swapId, updates);

    // If completed, trigger coin awards automatically
    if (targetStatus === "COMPLETED" && swap.status !== "COMPLETED") {
      const requester = this.storage.getUserById(swap.requesterId);
      const recipient = this.storage.getUserById(swap.recipientId);

      // Both taught and both learned in a reciprocal swap!
      this.storage.awardCoins(swap.requesterId, 40, "TEACH", `Completed reciprocal swap with ${recipient?.name || 'partner'}`);
      this.storage.awardCoins(swap.recipientId, 40, "TEACH", `Completed reciprocal swap with ${requester?.name || 'partner'}`);

      // Increment sessions completed
      if (requester) {
        requester.sessionsCompleted = (requester.sessionsCompleted || 0) + 1;
        this.storage.updateUser(requester);
      }
      if (recipient) {
        recipient.sessionsCompleted = (recipient.sessionsCompleted || 0) + 1;
        this.storage.updateUser(recipient);
      }
    }

    return updatedSwap;
  }

  // ==========================================
  // 3. IDEMPOTENT SWAP CREATION
  // ==========================================
  requestSwap(requesterId, recipientId, offeredSkill, requestedSkill, note = "", idempotencyKey = null) {
    if (!requesterId || !recipientId) throw new AppError("Requester and Recipient required", "BAD_REQUEST", 400);
    if (requesterId === recipientId) throw new AppError("Cannot request a swap with yourself", "SELF_SWAP_FORBIDDEN", 400);

    // Idempotency guard
    if (idempotencyKey) {
      if (this.processedIdempotencyKeys.has(idempotencyKey)) {
        throw new AppError("Duplicate request detected. Swap already processed.", "IDEMPOTENT_RETRY", 409);
      }
      this.processedIdempotencyKeys.add(idempotencyKey);
    }

    // Check for existing pending swap between these two users
    const existing = this.storage.getSwaps().find(s =>
      ((s.requesterId === requesterId && s.recipientId === recipientId) ||
       (s.requesterId === recipientId && s.recipientId === requesterId)) &&
      s.status === "PENDING"
    );

    if (existing) {
      throw new AppError("An active pending swap request already exists between you and this member.", "DUPLICATE_ACTIVE_SWAP", 409);
    }

    const swap = this.storage.createSwap({
      requesterId,
      recipientId,
      offeredSkill,
      requestedSkill,
      note: note.trim() || "Let's exchange skills in a collaborative 1-on-1 session!",
      scheduledAt: null,
      durationMin: 60
    });

    // Create an initial message in the swap thread
    this.storage.addMessage(
      swap.id,
      requesterId,
      this.storage.getUserById(requesterId)?.name || "Requester",
      `Swap requested: Offering "${offeredSkill}" in exchange for "${requestedSkill}". Note: ${swap.note}`
    );

    return swap;
  }

  // ==========================================
  // 4. AUTH & SESSION HELPERS
  // ==========================================
  login(email, password) {
    const user = this.storage.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== password) {
      throw new AppError("Invalid email or password", "AUTH_FAILED", 401);
    }
    this.storage.setCurrentUser(user.id);
    return user;
  }

  register(name, email, password, bio = "", timezone = "UTC-5 (Eastern Time)") {
    const existing = this.storage.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new AppError("An account with this email already exists", "EMAIL_EXISTS", 409);
    }

    const colors = ["#388bfd", "#2ea043", "#d29922", "#a371f7", "#db61a2"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser = {
      id: "usr_" + Date.now(),
      name,
      email,
      password,
      role: "member",
      bio: bio || "Passionate learner and peer teacher on SkillSwap.",
      timezone,
      avatarColor,
      coins: 20, // Free welcome bonus
      reputation: 5.0,
      sessionsCompleted: 0
    };

    const users = this.storage.getUsers();
    users.push(newUser);
    this.storage.saveUsers(users);
    this.storage.setCurrentUser(newUser.id);
    return newUser;
  }

  // Switch demo user helper
  switchDemoUser(userId) {
    const user = this.storage.getUserById(userId);
    if (!user) throw new AppError("User not found", "NOT_FOUND", 404);
    this.storage.setCurrentUser(user.id);
    window.location.reload();
  }
}

// Global instance
window.SkillSwapEngine = new BusinessEngine(window.SkillSwapStorage);

// ==========================================
// 5. TOAST NOTIFICATIONS & GLOBAL UI
// ==========================================
window.showToast = function(message, type = "success") {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-indicator"></span>
    <span class="toast-body">${message}</span>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};
