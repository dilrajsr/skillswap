// A "connection" is one session between one Learner and one Teacher.
// status: "pending"   - learner sent a request, waiting for the teacher
//         "active"    - teacher accepted, the session is running
//         "rejected"  - teacher said no
//         "cancelled" - learner took the request back
//         "ended"     - session finished, coins were given
let express = require("express")
let router = express.Router()

let { User, Connection } = require("../db")
let { verifyToken, requireRole } = require("../middleware/auth")

// coins awarded when a session ends
let coinsForTeaching = 40
let coinsForAttending = 10

// teacher and learner see their own sessions, admin sees all of them
router.get("/", verifyToken, async (req, res) => {
    let user = req.user
    let filter = {}
    if (user.role === "teacher") filter = { teacherId: user.id }
    if (user.role === "learner") filter = { learnerId: user.id }
    let list = await Connection.find(filter)
    res.json(list)
})

// learner picks ONE skill of a tutor and clicks "Get Connected" -> request is sent
router.post("/", verifyToken, requireRole("learner"), async (req, res) => {
    let learner = req.user
    let tutor = await User.findOne({ id: req.body.tutorId, role: "teacher" })
    if (!tutor) {
        return res.status(404).json({ message: "Tutor not found." })
    }

    // a skill must be chosen, and it has to be one the tutor really teaches
    let skill = req.body.skill
    if (!skill) {
        return res.status(400).json({ message: "Please choose a skill first." })
    }
    if (!tutor.teachSkills.includes(skill)) {
        return res.status(400).json({ message: "This tutor does not teach that skill." })
    }

    let learnerBusy = await Connection.findOne({ learnerId: learner.id, status: { $in: ["active", "pending"] } })
    if (learnerBusy) {
        return res.status(400).json({ message: "You already have an active session or a waiting request.", busy: true })
    }

    let tutorBusy = await Connection.findOne({ teacherId: tutor.id, status: "active" })
    if (tutorBusy) {
        return res.status(400).json({ message: "This tutor is currently in another session. Please try again soon." })
    }

    let newConnection = await Connection.create({
        id: Date.now().toString() + Math.floor(Math.random() * 1000),
        teacherId: tutor.id,
        teacherName: tutor.name,
        learnerId: learner.id,
        learnerName: learner.name,
        skill: skill,
        status: "pending",
        requestedAt: new Date().toISOString(),
        startedAt: null,
        endedAt: null
    })
    res.status(201).json(newConnection)
})

// finds a request that belongs to the logged in teacher and is still waiting
async function findMyPendingRequest(req, res) {
    let connection = await Connection.findOne({ id: req.params.id })
    if (!connection || connection.teacherId !== req.user.id) {
        res.status(404).json({ message: "Request not found." })
        return null
    }
    if (connection.status !== "pending") {
        res.status(400).json({ message: "This request is not waiting any more." })
        return null
    }
    return connection
}

// teacher accepts -> both are connected
router.post("/:id/accept", verifyToken, requireRole("teacher"), async (req, res) => {
    let connection = await findMyPendingRequest(req, res)
    if (!connection) return

    let teacherBusy = await Connection.findOne({ teacherId: req.user.id, status: "active" })
    if (teacherBusy) {
        return res.status(400).json({ message: "You are already in a session. End it before accepting another." })
    }

    connection.status = "active"
    connection.startedAt = new Date().toISOString()
    await connection.save()
    res.json(connection)
})

// teacher rejects -> learner is told it was rejected
router.post("/:id/reject", verifyToken, requireRole("teacher"), async (req, res) => {
    let connection = await findMyPendingRequest(req, res)
    if (!connection) return

    connection.status = "rejected"
    await connection.save()
    res.json(connection)
})

// learner takes back a request that is still waiting
router.post("/:id/cancel", verifyToken, requireRole("learner"), async (req, res) => {
    let connection = await Connection.findOne({ id: req.params.id })
    if (!connection || connection.learnerId !== req.user.id) {
        return res.status(404).json({ message: "Request not found." })
    }
    if (connection.status !== "pending") {
        return res.status(400).json({ message: "This request is not waiting any more." })
    }

    connection.status = "cancelled"
    await connection.save()
    res.json(connection)
})

// either person in the session can end it, both get their coins
router.post("/:id/end", verifyToken, async (req, res) => {
    let connection = await Connection.findOne({ id: req.params.id })
    if (!connection) {
        return res.status(404).json({ message: "Session not found." })
    }
    if (connection.teacherId !== req.user.id && connection.learnerId !== req.user.id) {
        return res.status(403).json({ message: "This is not your session." })
    }
    if (connection.status !== "active") {
        return res.status(400).json({ message: "This session is not active." })
    }

    connection.status = "ended"
    connection.endedAt = new Date().toISOString()

    let teacher = await User.findOne({ id: connection.teacherId })
    let learner = await User.findOne({ id: connection.learnerId })

    if (teacher) {
        teacher.coins += coinsForTeaching
        teacher.coinHistory.push({
            desc: `Taught ${connection.skill} to ${connection.learnerName}`,
            amount: coinsForTeaching,
            date: new Date().toLocaleDateString()
        })
        await teacher.save()
    }
    if (learner) {
        learner.coins += coinsForAttending
        learner.coinHistory.push({
            desc: `Attended ${connection.skill} session with ${connection.teacherName}`,
            amount: coinsForAttending,
            date: new Date().toLocaleDateString()
        })
        await learner.save()
    }

    await connection.save()
    let earned = req.user.role === "teacher" ? coinsForTeaching : coinsForAttending
    res.json({ connection, earned })
})

// admin only: delete a session / request from the history
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
    let deleted = await Connection.findOneAndDelete({ id: req.params.id })
    if (!deleted) {
        return res.status(404).json({ message: "Session not found." })
    }

    res.json({ message: "Session deleted" })
})

module.exports = router
