# SkillSwap

A peer-to-peer skill exchange platform. Teachers offer skills, learners request sessions, and coins are exchanged for completed sessions.

## Tech stack

- Node.js + Express 5
- MongoDB (via Mongoose)
- JWT auth (cookies) + express-session
- Multer for profile picture / intro video uploads
- Plain HTML/CSS/JS frontend in `public/`

## Requirements

- Node.js 18+
- MongoDB running on `localhost:27017`

## Getting started

```
npm install
npm start
```

Then open http://localhost:3000

## Admin login

- Email: `admin@skillswap.com`
- Password: `admin123`

The admin account is defined in `db.js` and is not stored in the database.

## Configuration

All optional environment variables:

| Variable         | Default                                  |
| ---------------- | ---------------------------------------- |
| `PORT`           | `3000`                                   |
| `MONGO_URL`      | `mongodb://127.0.0.1:27017/skillswap`    |
| `JWT_SECRET`     | built-in development secret              |
| `SESSION_SECRET` | built-in development secret              |

Set your own secrets for any real deployment.

## Project structure

```
server.js       app setup and routes mounting
db.js           Mongoose models and password helpers
middleware/     auth (JWT, roles) and upload (multer)
routes/         auth, users, connections API routes
public/         frontend pages, script.js, style.css
uploads/        user-uploaded profile pictures and intro videos
```

## Notes

- Data is stored in the MongoDB database `skillswap`.
- Uploaded files go in `uploads/profile-pictures` and `uploads/intro-videos` and are git-ignored.
