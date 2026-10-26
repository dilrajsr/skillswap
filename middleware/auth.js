let jwt = require("jsonwebtoken")
let { User, ADMIN_USER } = require("../db")

let jwtSecret = process.env.JWT_SECRET || "skillswap-jwt-secret"

// token lives for 2 hours, the cookie is set to the same time
let tokenLife = 2 * 60 * 60

function giveToken(res, user) {
    let token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, {
        expiresIn: tokenLife
    })
    res.cookie("token", token, {
        httpOnly: true,
        maxAge: tokenLife * 1000
    })
}

// reads the token cookie and fills req.user (same idea as verifytToken in the helper)
function verifyToken(req, res, next) {
    let userToken = req.cookies.token
    if (!userToken) {
        return res.status(401).json({ message: "Please login first." })
    }

    jwt.verify(userToken, jwtSecret, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Session expired. Please login again." })
        }

        // find the full profile, so a deleted/changed user cannot keep using an old token
        let user = decoded.id === ADMIN_USER.id
            ? ADMIN_USER
            : await User.findOne({ id: decoded.id })
        if (!user) {
            res.clearCookie("token")
            return res.status(401).json({ message: "Account not found." })
        }

        req.user = user
        next()
    })
}

// authorization: only let certain roles through (use after verifyToken)
function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: `Only ${role}s can do this.` })
        }
        next()
    }
}

// the token is only good if its account still exists (the server may have been
// restarted with empty data) - otherwise the pages would keep redirecting to each other
async function accountExists(decoded) {
    return decoded.id === ADMIN_USER.id || (await User.exists({ id: decoded.id })) !== null
}

// same as verifyToken but for HTML pages: redirect instead of sending JSON
function requireLoginPage(req, res, next) {
    let userToken = req.cookies.token
    if (!userToken) {
        return res.redirect("/login.html")
    }
    jwt.verify(userToken, jwtSecret, async (err, decoded) => {
        if (err || !(await accountExists(decoded))) {
            res.clearCookie("token")
            return res.redirect("/login.html")
        }
        next()
    })
}

// login/register pages are not needed by someone who is already logged in
function redirectIfLoggedIn(req, res, next) {
    let userToken = req.cookies.token
    if (!userToken) {
        return next()
    }
    jwt.verify(userToken, jwtSecret, async (err, decoded) => {
        if (err || !(await accountExists(decoded))) {
            res.clearCookie("token")
            return next()
        }
        res.redirect("/dashboard.html")
    })
}

module.exports = { giveToken, verifyToken, requireRole, requireLoginPage, redirectIfLoggedIn }
