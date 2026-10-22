/**
 * SkillSwap - Core Storage & State Layer
 * Emulates relational database tables using LocalStorage with tab-level session support.
 * Follows the schema defined in SKILLSWAP_ROADMAP.md (Section 1.5):
 * - users(id, email, password, name, bio, timezone, avatar, role, reputation, coins)
 * - skills(id, name, category)
 * - user_skills(id, user_id, skill_id, skill_name, type ['OFFER'|'WANT'], proficiency ['Beginner'|'Intermediate'|'Advanced'])
 * - swap_requests(id, requester_id, recipient_id, offered_skill, requested_skill, status ['PENDING'|'ACCEPTED'|'DECLINED'|'CANCELLED'|'COMPLETED'], scheduled_at, duration_min, created_at, updated_at)
 * - sessions(id, swap_request_id, teacher_id, learner_id, skill, scheduled_at, duration_min, status ['SCHEDULED'|'IN_PROGRESS'|'COMPLETED'])
 * - reviews(id, swap_request_id, reviewer_id, reviewee_id, rating, comment, created_at)
 * - messages(id, swap_request_id, sender_id, sender_name, body, created_at)
 * - coin_transactions(id, user_id, type ['TEACH'|'LEARN'|'BONUS'], amount, description, created_at)
 */

const STORAGE_KEYS = {
  USERS: "skillswap_db_users",
  USER_SKILLS: "skillswap_db_user_skills",
  SWAPS: "skillswap_db_swaps",
  SESSIONS: "skillswap_db_sessions",
  REVIEWS: "skillswap_db_reviews",
  MESSAGES: "skillswap_db_messages",
  COIN_LOGS: "skillswap_db_coin_logs",
  CURRENT_USER_ID: "skillswap_session_user_id",
  SEEDED: "skillswap_db_seeded_v3"
};

// Default seed data representing real users with reciprocal match opportunities
const SEED_USERS = [
  {
    id: "usr_alex",
    name: "Alex Chen",
    email: "alex@example.com",
    password: "password123",
    role: "member",
    bio: "Senior Software Engineer with 6+ years experience. Passionate about Python, React, and system design. Long-time acoustic guitar enthusiast looking to finally master fingerpicking!",
    timezone: "UTC-5 (Eastern Time)",
    avatarColor: "#388bfd",
    coins: 160,
    reputation: 4.9,
    sessionsCompleted: 4
  },
  {
    id: "usr_elena",
    name: "Elena Rostova",
    email: "elena@example.com",
    password: "password123",
    role: "member",
    bio: "Classical guitarist & Spanish language instructor. Transitioning into data science and tech. Love teaching structured music theory and conversational Spanish.",
    timezone: "UTC-5 (Eastern Time)",
    avatarColor: "#2ea043",
    coins: 210,
    reputation: 5.0,
    sessionsCompleted: 5
  },
  {
    id: "usr_marcus",
    name: "Marcus Vance",
    email: "marcus@example.com",
    password: "password123",
    role: "member",
    bio: "Principal Product Designer. Master of Figma, design systems, and UX research. Eager to understand React and frontend architectures to bridge design and code.",
    timezone: "UTC-8 (Pacific Time)",
    avatarColor: "#d29922",
    coins: 90,
    reputation: 4.8,
    sessionsCompleted: 2
  },
  {
    id: "usr_priya",
    name: "Priya Patel",
    email: "priya@example.com",
    password: "password123",
    role: "member",
    bio: "Data Analyst & SQL specialist. Looking to conquer stage fright and polish executive public speaking skills for tech conference talks.",
    timezone: "UTC+1 (Central European Time)",
    avatarColor: "#a371f7",
    coins: 120,
    reputation: 4.9,
    sessionsCompleted: 3
  },
  {
    id: "usr_admin",
    name: "Platform Administrator",
    email: "admin@skillswap.com",
    password: "adminpassword",
    role: "admin",
    bio: "System administrator with platform oversight, moderation, and metric analytics access.",
    timezone: "UTC+0 (UTC)",
    avatarColor: "#f85149",
    coins: 0,
    reputation: 5.0,
    sessionsCompleted: 0
  }
];

const SEED_USER_SKILLS = [
  // Alex: Offers Python, React. Wants Acoustic Guitar, Conversational Spanish.
  { id: "usk_1", userId: "usr_alex", skillName: "Python Programming", category: "Technology", type: "OFFER", proficiency: "Advanced" },
  { id: "usk_2", userId: "usr_alex", skillName: "React & Frontend Architecture", category: "Technology", type: "OFFER", proficiency: "Advanced" },
  { id: "usk_3", userId: "usr_alex", skillName: "Acoustic Guitar", category: "Music", type: "WANT", proficiency: "Beginner" },
  { id: "usk_4", userId: "usr_alex", skillName: "Conversational Spanish", category: "Languages", type: "WANT", proficiency: "Beginner" },

  // Elena: Offers Acoustic Guitar, Conversational Spanish. Wants Python Programming, UI/UX Design.
  // NOTE: Perfect mutual bidirectional match with Alex!
  { id: "usk_5", userId: "usr_elena", skillName: "Acoustic Guitar", category: "Music", type: "OFFER", proficiency: "Advanced" },
  { id: "usk_6", userId: "usr_elena", skillName: "Conversational Spanish", category: "Languages", type: "OFFER", proficiency: "Advanced" },
  { id: "usk_7", userId: "usr_elena", skillName: "Python Programming", category: "Technology", type: "WANT", proficiency: "Intermediate" },
  { id: "usk_8", userId: "usr_elena", skillName: "UI/UX Design", category: "Design", type: "WANT", proficiency: "Beginner" },

  // Marcus: Offers UI/UX Design, Figma Systems. Wants React & Frontend Architecture, Python Programming.
  { id: "usk_9", userId: "usr_marcus", skillName: "UI/UX Design", category: "Design", type: "OFFER", proficiency: "Advanced" },
  { id: "usk_10", userId: "usr_marcus", skillName: "Figma Systems", category: "Design", type: "OFFER", proficiency: "Advanced" },
  { id: "usk_11", userId: "usr_marcus", skillName: "React & Frontend Architecture", category: "Technology", type: "WANT", proficiency: "Beginner" },

  // Priya: Offers SQL & Databases, Data Visualization. Wants Public Speaking & Presentation.
  { id: "usk_12", userId: "usr_priya", skillName: "SQL & Relational Databases", category: "Technology", type: "OFFER", proficiency: "Advanced" },
  { id: "usk_13", userId: "usr_priya", skillName: "Public Speaking & Presentation", category: "Business", type: "WANT", proficiency: "Beginner" }
];

const SEED_SWAPS = [
  {
    id: "swp_101",
    requesterId: "usr_elena",
    recipientId: "usr_alex",
    offeredSkill: "Acoustic Guitar",
    requestedSkill: "Python Programming",
    status: "PENDING",
    note: "Hi Alex! I saw you want to learn fingerpicking acoustic guitar. I'd love to swap for help with Python data structures!",
    scheduledAt: null,
    durationMin: 45,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: "swp_102",
    requesterId: "usr_marcus",
    recipientId: "usr_alex",
    offeredSkill: "UI/UX Design",
    requestedSkill: "React & Frontend Architecture",
    status: "ACCEPTED",
    note: "Hey Alex, let's exchange design system tokens for component hierarchy advice.",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    durationMin: 60,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: "swp_103",
    requesterId: "usr_alex",
    recipientId: "usr_priya",
    offeredSkill: "Python Programming",
    requestedSkill: "SQL & Relational Databases",
    status: "COMPLETED",
    note: "Swap complete: database indexing session for pandas script troubleshooting.",
    scheduledAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    durationMin: 60,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

const SEED_MESSAGES = [
  {
    id: "msg_1",
    swapRequestId: "swp_102",
    senderId: "usr_marcus",
    senderName: "Marcus Vance",
    body: "Hi Alex, excited for our session tomorrow! I've prepped Figma component variants to review.",
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString()
  },
  {
    id: "msg_2",
    swapRequestId: "swp_102",
    senderId: "usr_alex",
    senderName: "Alex Chen",
    body: "Awesome! I have a live Vite + Tailwind boilerplate ready to demo how the token mapping works.",
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString()
  }
];

const SEED_REVIEWS = [
  {
    id: "rev_1",
    swapRequestId: "swp_103",
    reviewerId: "usr_priya",
    reviewerName: "Priya Patel",
    revieweeId: "usr_alex",
    rating: 5,
    comment: "Alex is an exceptional mentor. Explained async concurrency and generator functions clearly with real examples!",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: "rev_2",
    swapRequestId: "swp_103",
    reviewerId: "usr_alex",
    reviewerName: "Alex Chen",
    revieweeId: "usr_priya",
    rating: 5,
    comment: "Priya was super thorough with SQL query planning and EXPLAIN ANALYZE index walkthroughs. Highly recommend!",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

const SEED_COIN_LOGS = [
  {
    id: "cl_1",
    userId: "usr_alex",
    type: "TEACH",
    amount: 40,
    description: "Completed reciprocal teaching session with Priya Patel (Python)",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: "cl_2",
    userId: "usr_alex",
    type: "LEARN",
    amount: 10,
    description: "Attended learning session with Priya Patel (SQL)",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: "cl_3",
    userId: "usr_priya",
    type: "TEACH",
    amount: 40,
    description: "Completed reciprocal teaching session with Alex Chen (SQL)",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

class StorageEngine {
  constructor() {
    this.initDatabase();
  }

  initDatabase(forceReset = false) {
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.SEEDED)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
      localStorage.setItem(STORAGE_KEYS.USER_SKILLS, JSON.stringify(SEED_USER_SKILLS));
      localStorage.setItem(STORAGE_KEYS.SWAPS, JSON.stringify(SEED_SWAPS));
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(SEED_MESSAGES));
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(SEED_REVIEWS));
      localStorage.setItem(STORAGE_KEYS.COIN_LOGS, JSON.stringify(SEED_COIN_LOGS));
      localStorage.setItem(STORAGE_KEYS.SEEDED, "true");

      // Default active session user to Alex Chen if none set
      if (!sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
        sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, "usr_alex");
      }
    }
  }

  // Generic Get & Save
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading ${key}:`, e);
      return [];
    }
  }

  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Error saving ${key}:`, e);
      return false;
    }
  }

  // Users
  getUsers() { return this.get(STORAGE_KEYS.USERS); }
  getUserById(id) { return this.getUsers().find(u => u.id === id) || null; }
  saveUsers(users) { return this.save(STORAGE_KEYS.USERS, users); }

  updateUser(updatedUser) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === updatedUser.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updatedUser };
      this.saveUsers(users);
      return users[idx];
    }
    return null;
  }

  // Session User (Tab-specific via sessionStorage)
  getCurrentUser() {
    const id = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (!id) return null;
    return this.getUserById(id);
  }

  setCurrentUser(userId) {
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  }

  logout() {
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  }

  // User Skills
  getUserSkills(userId = null) {
    const all = this.get(STORAGE_KEYS.USER_SKILLS);
    if (userId) return all.filter(s => s.userId === userId);
    return all;
  }

  saveUserSkills(skills) { return this.save(STORAGE_KEYS.USER_SKILLS, skills); }

  addUserSkill(skill) {
    const all = this.getUserSkills();
    const newSkill = {
      id: "usk_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      ...skill
    };
    all.push(newSkill);
    this.saveUserSkills(all);
    return newSkill;
  }

  removeUserSkill(skillId) {
    let all = this.getUserSkills();
    all = all.filter(s => s.id !== skillId);
    this.saveUserSkills(all);
    return true;
  }

  // Swaps
  getSwaps() { return this.get(STORAGE_KEYS.SWAPS); }
  saveSwaps(swaps) { return this.save(STORAGE_KEYS.SWAPS, swaps); }

  getSwapById(id) {
    return this.getSwaps().find(s => s.id === id) || null;
  }

  createSwap(swapData) {
    const swaps = this.getSwaps();
    const newSwap = {
      id: "swp_" + Date.now(),
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scheduledAt: null,
      durationMin: 60,
      ...swapData
    };
    swaps.unshift(newSwap);
    this.saveSwaps(swaps);
    return newSwap;
  }

  updateSwap(swapId, updates) {
    const swaps = this.getSwaps();
    const idx = swaps.findIndex(s => s.id === swapId);
    if (idx !== -1) {
      swaps[idx] = {
        ...swaps[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveSwaps(swaps);
      return swaps[idx];
    }
    return null;
  }

  // Messages
  getMessages(swapId = null) {
    const msgs = this.get(STORAGE_KEYS.MESSAGES);
    if (swapId) return msgs.filter(m => m.swapRequestId === swapId);
    return msgs;
  }

  addMessage(swapId, senderId, senderName, body) {
    const msgs = this.get(STORAGE_KEYS.MESSAGES);
    const newMsg = {
      id: "msg_" + Date.now(),
      swapRequestId: swapId,
      senderId,
      senderName,
      body,
      createdAt: new Date().toISOString()
    };
    msgs.push(newMsg);
    this.save(STORAGE_KEYS.MESSAGES, msgs);
    return newMsg;
  }

  // Reviews
  getReviews(revieweeId = null) {
    const revs = this.get(STORAGE_KEYS.REVIEWS);
    if (revieweeId) return revs.filter(r => r.revieweeId === revieweeId);
    return revs;
  }

  addReview(reviewData) {
    const revs = this.get(STORAGE_KEYS.REVIEWS);
    const newRev = {
      id: "rev_" + Date.now(),
      createdAt: new Date().toISOString(),
      ...reviewData
    };
    revs.push(newRev);
    this.save(STORAGE_KEYS.REVIEWS, revs);

    // Recompute user reputation
    const userReviews = revs.filter(r => r.revieweeId === reviewData.revieweeId);
    const avgRating = (userReviews.reduce((sum, r) => sum + Number(r.rating), 0) / userReviews.length).toFixed(1);
    const user = this.getUserById(reviewData.revieweeId);
    if (user) {
      user.reputation = Number(avgRating);
      this.updateUser(user);
    }
    return newRev;
  }

  // Coin Activity
  getCoinLogs(userId = null) {
    const logs = this.get(STORAGE_KEYS.COIN_LOGS);
    if (userId) return logs.filter(l => l.userId === userId);
    return logs;
  }

  awardCoins(userId, amount, type, description) {
    const user = this.getUserById(userId);
    if (!user) return null;
    user.coins = (user.coins || 0) + amount;
    this.updateUser(user);

    const logs = this.get(STORAGE_KEYS.COIN_LOGS);
    logs.unshift({
      id: "cl_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      userId,
      amount,
      type,
      description,
      createdAt: new Date().toISOString()
    });
    this.save(STORAGE_KEYS.COIN_LOGS, logs);
    return user;
  }

  getCoinBalance(userId) {
    const user = this.getUserById(userId);
    return user ? (user.coins || 0) : 0;
  }

  getCoins(userId) {
    return this.getCoinBalance(userId);
  }

  // Reset database helper for live testing
  resetDatabase() {
    this.initDatabase(true);
  }
}

// Global instance
window.SkillSwapStorage = new StorageEngine();
