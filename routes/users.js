let express = require("express")
let fs = require("fs")
let path = require("path")
let router = express.Router()

let { User, Connection, safeUser, publicUser } = require("../db")
let { verifyToken, requireRole } = require("../middleware/auth")
let { uploadPicture, uploadVideo } = require("../middleware/upload")

// ----- public tutor info (used by the home page, Find Tutor and the tutor profile) -----

router.get("/tutors", async (req, res) => {
    let tutors = await User.find({ role: "teacher" })
    res.json(tutors.map(publicUser))
})

router.get("/tutors/:id", async (req, res) => {
    let tutor = await User.findOne({ id: req.params.id, role: "teacher" })
    if (!tutor) {
        return res.status(404).json({ message: "Tutor not found" })
    }
    res.json(publicUser(tutor))
})

// ----- leaderboard (logged in users only) -----

router.get("/leaderboard", verifyToken, async (req, res) => {
    let tutors = (await User.find({ role: "teacher" })).map(publicUser)
    let learners = (await User.find({ role: "learner" })).map(publicUser)
    res.json({ tutors, learners })
})

// ----- admin only: list of every user -----

router.get("/admin/users", verifyToken, requireRole("admin"), async (req, res) => {
    let users = await User.find()
    res.json(users.map(safeUser))
})

// admin only: delete a user, their uploaded picture/video and all their sessions
router.delete("/admin/users/:id", verifyToken, requireRole("admin"), async (req, res) => {
    let user = await User.findOne({ id: req.params.id })
    if (!user) {
        return res.status(404).json({ message: "User not found" })
    }

    deleteOldFile(user.pictureUrl)
    deleteOldFile(user.videoUrl)

    await User.deleteOne({ id: user.id })
    await Connection.deleteMany({ $or: [{ teacherId: user.id }, { learnerId: user.id }] })
    res.json({ message: "User deleted" })
})

// ----- edit my profile -----

router.put("/profile", verifyToken, async (req, res) => {
    if (req.user.role === "admin") {
        return res.status(403).json({ message: "The admin account cannot be edited." })
    }
    let { name, bio } = req.body
    if (!name || name.trim() == "") {
        return res.status(400).json({ message: "Name cannot be empty." })
    }

    req.user.name = name.trim()
    req.user.bio = (bio || "").trim()
    await req.user.save()
    res.json(safeUser(req.user))
})

// ----- skills: teachers add "teach" skills, learners add "learn" skills -----

router.post("/skills", verifyToken, async (req, res) => {
    let skill = (req.body.skill || "").trim()
    if (req.user.role === "admin") {
        return res.status(403).json({ message: "Admins don't have skills." })
    }
    if (skill == "") {
        return res.status(400).json({ message: "Please enter a skill." })
    }

    let list = req.user.role === "teacher" ? req.user.teachSkills : req.user.learnSkills
    list.push(skill)
    await req.user.save()
    res.json(safeUser(req.user))
})

router.delete("/skills/:index", verifyToken, async (req, res) => {
    if (req.user.role === "admin") {
        return res.status(403).json({ message: "Admins don't have skills." })
    }

    let list = req.user.role === "teacher" ? req.user.teachSkills : req.user.learnSkills
    let index = Number(req.params.index)
    if (!Number.isInteger(index) || index < 0 || index >= list.length) {
        return res.status(404).json({ message: "Skill not found" })
    }

    list.splice(index, 1)
    await req.user.save()
    res.json(safeUser(req.user))
})

// ----- uploads -----

// removes the old file from the disk when a new one replaces it
function deleteOldFile(url) {
    if (!url) return
    fs.unlink(path.join(__dirname, "..", url), (err) => {
        if (err) console.log("could not delete old file:", err.message)
    })
}

// profile picture: teachers and learners
router.post("/profile/picture", verifyToken, (req, res, next) => {
    if (req.user.role === "admin") {
        return res.status(403).json({ message: "The admin account cannot be edited." })
    }
    next()
}, uploadPicture, async (req, res) => {
    deleteOldFile(req.user.pictureUrl)
    req.user.pictureUrl = "/uploads/profile-pictures/" + req.file.filename
    await req.user.save()
    res.json(safeUser(req.user))
})

// introduction video: teachers only
router.post("/profile/video", verifyToken, requireRole("teacher"), uploadVideo, async (req, res) => {
    deleteOldFile(req.user.videoUrl)
    req.user.videoUrl = "/uploads/intro-videos/" + req.file.filename
    await req.user.save()
    res.json(safeUser(req.user))
})

router.delete("/profile/video", verifyToken, requireRole("teacher"), async (req, res) => {
    deleteOldFile(req.user.videoUrl)
    req.user.videoUrl = ""
    await req.user.save()
    res.json(safeUser(req.user))
})

module.exports = router
