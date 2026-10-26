let express = require("express")
let router = express.Router()

let { User, hashPassword, checkPassword, ADMIN_USER, safeUser } = require("../db")
let { giveToken, verifyToken } = require("../middleware/auth")

// register a new Learner or Teacher profile
router.post("/register", async (req, res) => {
    let { name, email, password, role } = req.body

    if (!name || !email || !password || !name.trim() || !email.trim()) {
        return res.status(400).json({ message: "Please fill in all fields." })
    }
    name = name.trim()
    email = email.trim().toLowerCase()

    if (!email.includes("@")) {
        return res.status(400).json({ message: "Please enter a valid email address." })
    }
    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." })
    }
    // admin can never be registered
    if (role !== "learner" && role !== "teacher") {
        return res.status(400).json({ message: "Role must be learner or teacher." })
    }
    if (email === ADMIN_USER.email) {
        return res.status(400).json({ message: "This email cannot be used." })
    }

    // one email can have one Teacher and one Learner profile
    let alreadyExists = await User.findOne({ email: email, role: role })
    if (alreadyExists) {
        return res.status(400).json({ message: `You already have a ${role} profile with this email.` })
    }

    // coins start at 0 - they are only earned by completing sessions
    let newUser = await User.create({
        id: Date.now().toString() + Math.floor(Math.random() * 1000),
        name: name,
        email: email,
        password: hashPassword(password),
        role: role,
        bio: "",
        teachSkills: [],
        learnSkills: [],
        coins: 0,
        reputation: 5,
        coinHistory: [],
        pictureUrl: "",
        videoUrl: ""
    })

    giveToken(res, newUser)
    res.status(201).json(safeUser(newUser))
})

// login: if the email has more than one profile, the user has to choose one
router.post("/login", async (req, res) => {
    let { email, password } = req.body
    if (!email || !password) {
        return res.status(400).json({ message: "Please enter email and password." })
    }
    email = email.trim().toLowerCase()

    if (email === ADMIN_USER.email && password === ADMIN_USER.password) {
        giveToken(res, ADMIN_USER)
        return res.json(safeUser(ADMIN_USER))
    }

    let found = await User.find({ email: email })
    let matches = found.filter((u) => checkPassword(password, u.password))

    if (matches.length === 0) {
        return res.status(401).json({ message: "Invalid email or password." })
    }

    if (matches.length === 1) {
        giveToken(res, matches[0])
        return res.json(safeUser(matches[0]))
    }

    // remember the matched profiles in the session until the user picks one
    req.session.pendingProfiles = matches.map((u) => u.id)
    res.json({ chooseProfile: matches.map((u) => ({ id: u.id, role: u.role })) })
})

// second step of login: pick one of the profiles found in the session
router.post("/login/choose", async (req, res) => {
    let pending = req.session.pendingProfiles
    if (!pending || !pending.includes(req.body.id)) {
        return res.status(400).json({ message: "Please login again." })
    }

    let user = await User.findOne({ id: req.body.id })
    req.session.pendingProfiles = null
    giveToken(res, user)
    res.json(safeUser(user))
})

router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err)
        }
        res.clearCookie("sid")
        res.clearCookie("token")
        res.json({ message: "Logged out" })
    })
})

// who is logged in right now?
router.get("/me", verifyToken, (req, res) => {
    res.json(safeUser(req.user))
})

module.exports = router
