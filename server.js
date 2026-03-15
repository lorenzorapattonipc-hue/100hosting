# 100Hosting — Discord Bot Hosting Platform

A full-stack platform for hosting Discord bots. Users register, upload their bot.js file + token, and can start/stop/monitor their bots from a dashboard.

---

## Stack
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Auth**: JWT
- **Process management**: Node child_process
- **Frontend**: Vanilla HTML/CSS/JS (served by the backend)

---

## Deploy to Railway (Free)

### Step 1 — Create a Railway account
Go to https://railway.app and sign up (free, no credit card needed).

### Step 2 — Push this project to GitHub
1. Create a new GitHub repo
2. Upload the contents of the `backend/` folder as the root of the repo
3. Also include the `frontend/` folder

Your repo structure should look like:
```
/
├── server.js
├── db.js
├── middleware.js
├── processManager.js
├── package.json
├── railway.json
├── routes/
│   ├── auth.js
│   └── bots.js
├── frontend/
│   └── public/
│       └── index.html
└── uploads/   (auto-created)
```

### Step 3 — Deploy on Railway
1. In Railway dashboard, click **New Project** → **Deploy from GitHub repo**
2. Select your repo
3. Railway auto-detects Node.js and runs `npm start`

### Step 4 — Set environment variables
In Railway dashboard → your service → **Variables**, add:
```
JWT_SECRET=some-very-long-random-secret-string-here
```
(PORT is set automatically by Railway)

### Step 5 — Done!
Railway gives you a public URL like `https://your-app.railway.app`.
Share that URL with your users!

---

## How it works for users

1. User visits your site and registers an account
2. They click **Add Bot**, paste their Discord bot token, and upload their `bot.js` file
3. They click **Start** — the backend spawns a Node.js child process running their bot
4. The bot token is passed via environment variable `BOT_TOKEN` (never stored in the file)
5. All bot output (stdout/stderr) is captured and shown in the **Logs** panel
6. Users can Start/Stop/Delete their bots anytime from the dashboard

---

## Bot file requirements

Users' bot files must:
- Be valid Node.js (.js)
- Use `process.env.BOT_TOKEN` for the token (injected automatically)
- Have `discord.js` available (users need to include it — see note below)

### Important: discord.js dependency
User-uploaded bots need `discord.js` to be installed on the server.
After deploying, SSH into your Railway service and run:
```bash
npm install discord.js
```
Or add it to package.json dependencies.

---

## Free plan limits
- 3 bots per user
- 5MB max file size per bot
- Logs retained: last 200 lines per bot

---

## Local development
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set JWT_SECRET
node server.js
```
Open http://localhost:3000

---

## Security notes
- Bot tokens are stored in the SQLite database — use a strong JWT_SECRET
- In production, consider encrypting tokens at rest
- The platform runs user code as child processes — only deploy for trusted users or add sandboxing
