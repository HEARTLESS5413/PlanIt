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
| Database | SQLite (better-sqlite3) |
| Auth | bcrypt + JWT |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ installed

### Installation

```bash
# Clone the repository
git clone https://github.com/HEARTLESS5413/PlanIt.git
cd PlanIt

# Install dependencies
npm install

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
├── server.js           # Express API server (auth + CRUD)
├── vite.config.js      # Vite dev server config
├── package.json
├── .gitignore
└── src/
    ├── style.css       # Design system + responsive styles
    ├── main.js         # App logic, UI handlers
    ├── api.js          # API client & auth module
    └── reminders.js    # Browser notification system
```

## 🌐 Deployment

### Deploy to Render (Recommended)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New **Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `JWT_SECRET` = (any secure random string)
     - `PORT` = `3001` (or leave for Render to auto-assign)
5. Deploy!

## 📄 License

MIT
