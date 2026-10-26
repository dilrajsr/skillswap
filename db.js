// MongoDB database (using mongoose). Data is saved in the "skillswap" database.
let mongoose = require("mongoose")
let crypto = require("crypto")

mongoose.connect(process.env.MONGO_URL || "mongodb://127.0.0.1:27017/skillswap")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log("MongoDB connection failed:", err.message))

// what a user looks like in the database
let User = mongoose.model("User", new mongoose.Schema({
    id: String,
    name: String,
    email: String,
    password: String,
    role: String,
    bio: { type: String, default: "" },
    teachSkills: { type: [String], default: [] },
    learnSkills: { type: [String], default: [] },
    coins: { type: Number, default: 0 },
    reputation: { type: Number, default: 5 },
    coinHistory: { type: [{ desc: String, amount: Number, date: String }], default: [] },
    pictureUrl: { type: String, default: "" },
    videoUrl: { type: String, default: "" }
}))

// what a connection (session) looks like in the database
let Connection = mongoose.model("Connection", new mongoose.Schema({
    id: String,
    teacherId: String,
    teacherName: String,
    learnerId: String,
    learnerName: String,
    skill: String,
    status: String,
    requestedAt: String,
    startedAt: String,
    endedAt: String
}))

// passwords are stored hashed, never as plain text
function hashPassword(password) {
    let salt = crypto.randomBytes(16).toString("hex")
    let hash = crypto.scryptSync(password, salt, 32).toString("hex")
    return salt + ":" + hash
}

function checkPassword(password, stored) {
    let [salt, hash] = stored.split(":")
    let attempt = crypto.scryptSync(password, salt, 32).toString("hex")
    return crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(hash))
}

// the admin account is fixed in the code and never stored in the database
let ADMIN_USER = {
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
}

// what the browser is allowed to see about a user (no password)
function safeUser(u) {
    let { password, _id, __v, ...rest } = u.toObject ? u.toObject() : u
    return rest
}

// what other people are allowed to see about a tutor/learner (no email either)
function publicUser(u) {
    let { password, email, coinHistory, _id, __v, ...rest } = u.toObject()
    return rest
}

module.exports = { User, Connection, hashPassword, checkPassword, ADMIN_USER, safeUser, publicUser }
