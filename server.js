let express = require("express")
let session = require("express-session")
let cookieParser = require("cookie-parser")
let path = require("path")

let { requireLoginPage, redirectIfLoggedIn } = require("./middleware/auth")

let app = express()

app.use(express.json())
app.use(cookieParser())

// session is used while a user with two profiles (teacher + learner) picks one at login
app.use(session({
    name: "sid",
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || "skillswap-session-secret",
    cookie: {
        maxAge: 1000 * 60 * 60 * 2 // 2 hours
    }
}))

// ----- API routes -----
app.use("/api", require("./routes/auth"))
app.use("/api", require("./routes/users"))
app.use("/api/connections", require("./routes/connections"))

// unknown /api address -> JSON error instead of an html page
app.use("/api", (req, res) => {
    res.status(404).json({ message: "Route not found" })
})

// ----- Page routes -----
let publicFolder = path.join(__dirname, "public")

app.get("/", (req, res) => {
    res.sendFile(path.join(publicFolder, "index.html"))
})

// these pages need a login, otherwise the user is sent to the login page
app.get(
    ["/dashboard.html", "/skills.html", "/find-tutor.html", "/tutor.html", "/sessions.html", "/chat.html", "/coins.html", "/profile.html"],
    requireLoginPage,
    (req, res) => {
        res.sendFile(path.join(publicFolder, req.path))
    }
)

// logged in users don't need these two pages
app.get("/login.html", redirectIfLoggedIn, (req, res) => {
    res.sendFile(path.join(publicFolder, "login.html"))
})
app.get("/register.html", redirectIfLoggedIn, (req, res) => {
    res.sendFile(path.join(publicFolder, "register.html"))
})

// easy addresses
app.get("/login", (req, res) => res.redirect("/login.html"))
app.get("/register", (req, res) => res.redirect("/register.html"))
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("sid")
        res.clearCookie("token")
        res.redirect("/login.html")
    })
})

// css, script.js and the home page
app.use(express.static(publicFolder))

// uploaded pictures and videos (static also supports video seeking)
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// anything else
app.use((req, res) => {
    res.status(404).send(`<h1>Page not found</h1><a href="/">Back to home</a>`)
})

// last safety net for unexpected errors
app.use((err, req, res, next) => {
    console.log(err)
    res.status(500).json({ message: "Something went wrong on the server." })
})

let port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`SkillSwap is running on http://localhost:${port}`)
})
