// Multer setup for profile pictures and teacher introduction videos
// (same diskStorage / fileFilter / limits pattern as helperfiles/multer_g2)
let multer = require("multer")
let path = require("path")

// the extension is picked from the checked mimetype, not from the user's file name
let imageTypes = { "image/png": ".png", "image/jpeg": ".jpg" }
let videoTypes = { "video/mp4": ".mp4", "video/webm": ".webm" }

function makeUpload(folder, allowedTypes, maxMB, message) {
    let storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path.join(__dirname, "..", "uploads", folder))
        },
        // unique name: user id + time, e.g. 1729780000000123-1729781234567.mp4
        filename: (req, file, cb) => {
            cb(null, req.user.id + "-" + Date.now() + allowedTypes[file.mimetype])
        }
    })

    return multer({
        storage: storage,
        fileFilter: (req, file, cb) => {
            if (allowedTypes[file.mimetype]) {
                cb(null, true)
            } else {
                cb(new Error(message))
            }
        },
        limits: {
            fileSize: 1024 * 1024 * maxMB
        }
    })
}

let pictureUpload = makeUpload("profile-pictures", imageTypes, 15, "Only jpeg and png pictures are allowed")
let videoUpload = makeUpload("intro-videos", videoTypes, 50, "Only mp4 and webm videos are allowed")

// runs multer and answers with JSON if something is wrong (wrong type, too big...)
function handleUpload(upload, fieldName) {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
            if (err) {
                let message = err.code === "LIMIT_FILE_SIZE" ? "File is too big." : err.message
                return res.status(400).json({ message: message })
            }
            if (!req.file) {
                return res.status(400).json({ message: "Please choose a file." })
            }
            next()
        })
    }
}

module.exports = {
    uploadPicture: handleUpload(pictureUpload, "picture"),
    uploadVideo: handleUpload(videoUpload, "video")
}
