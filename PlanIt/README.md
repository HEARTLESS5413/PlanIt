# PlanIt — Your Day, Organized ✅

A modern, beautiful to-do list and day planner with authentication, time-based reminders, and a stunning anime-style loading screen.

## ✨ Features

- **User Authentication** — Register & login with secure password hashing (bcrypt + JWT)
- **Day Planner** — Organize tasks by date with an interactive weekly calendar strip
- **Task Management** — Create, edit, delete tasks with priority levels (High / Medium / Low)
- **Time Reminders** — Browser notifications when task time arrives
- **Dark / Light Mode** — Toggle between themes with smooth transitions
- **Anime Loading Screen** — Beautiful SVG draw animation with floating particles
- **Fully Responsive** — Works perfectly on desktop, tablet, and mobile with bottom navigation bar
- **Touch Friendly** — Optimized tap targets and gestures for mobile browsers

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Build | Vite 5 |
| Backend | Express.js |
| Database | PostgreSQL |
| Auth | bcrypt + JWT |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ installed
- [PostgreSQL](https://www.postgresql.org/) installed locally (or a cloud database URL)

### Installation

```bash
# Clone the repository
git clone https://github.com/HEARTLESS5413/PlanIt.git
cd PlanIt

# Install dependencies
npm install

# Set up environment variable (create .env file or export)
# For local PostgreSQL:
export DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/planit

# Start development server
npm run dev
```

The app will be available at **http://localhost:5173**  
API server runs at **http://localhost:3001**

### Production Build

```bash
# Build the frontend
npm run build

# Start production server (serves both API + static files)
npm start
```

## 📁 Project Structure

```
PlanIt/
├── index.html          # Main HTML with loading screen & mobile nav
├── server.js           # Express API server (auth + CRUD) — PostgreSQL
├── vite.config.js      # Vite dev server config
├── package.json
├── .gitignore
└── src/
    ├── style.css       # Design system + responsive styles
    ├── main.js         # App logic, UI handlers
    ├── api.js          # API client & auth module
    └── reminders.js    # Browser notification system
```

## 🌐 Deployment on Render

### Step 1: Create a PostgreSQL Database on Render

1. Go to [render.com](https://render.com) → **Dashboard**
2. Click **New +** → **PostgreSQL**
3. Fill in:
   - **Name:** `planit-db`
   - **Database:** `planit`
   - **User:** `planit_user`
   - **Region:** Choose closest to your users
   - **Plan:** **Free** (90-day) or **Starter** ($7/mo for persistent)
4. Click **Create Database**
5. Once created, copy the **Internal Database URL** (starts with `postgresql://...`)

### Step 2: Deploy the Web Service

1. Push your code to GitHub
2. On Render → click **New +** → **Web Service**
3. Connect your GitHub repo (`HEARTLESS5413/PlanIt`)
4. Configure settings:
   - **Name:** `planit`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Add **Environment Variables:**
   - `DATABASE_URL` = *(paste the Internal Database URL from Step 1)*
   - `JWT_SECRET` = *(any secure random string, e.g., `mySecureJwtSecret2024!`)*
   - `NODE_ENV` = `production`
6. Click **Deploy Web Service**

### Step 3: Verify

- Wait for the build to complete (usually 2-3 minutes)
- Visit your Render URL (e.g., `https://planit-xxxx.onrender.com`)
- Register a new account and create some tasks!

> **Note:** On the Free tier, Render spins down your service after 15 minutes of inactivity. The first request after that takes ~30 seconds. Upgrade to Starter ($7/mo) for always-on service.

## 📄 License

MIT
