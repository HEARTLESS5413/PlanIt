import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'planit-secret-key-2024-super-secure';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in production
app.use(express.static(join(__dirname, 'dist')));

// Database setup
const db = new Database(join(__dirname, 'planit.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    date TEXT NOT NULL,
    time TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userName = decoded.name;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============ AUTH ROUTES ============

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }



  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashed);

  const token = jwt.sign({ id: result.lastInsertRowid, name, email }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user: { id: result.lastInsertRowid, name, email } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// ============ TODO ROUTES ============

app.get('/api/todos', authenticate, (req, res) => {
  const { date } = req.query;
  let todos;

  if (date) {
    todos = db.prepare('SELECT * FROM todos WHERE user_id = ? AND date = ? ORDER BY time ASC, created_at DESC').all(req.userId, date);
  } else {
    todos = db.prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY date ASC, time ASC').all(req.userId);
  }

  res.json(todos);
});

app.post('/api/todos', authenticate, (req, res) => {
  const { title, description, date, time, priority } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required' });
  }

  const result = db.prepare(
    'INSERT INTO todos (user_id, title, description, date, time, priority) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.userId, title, description || '', date, time || '', priority || 'medium');

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
  res.json(todo);
});

app.put('/api/todos/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { title, description, date, time, priority, completed } = req.body;

  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(id, req.userId);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  db.prepare(
    'UPDATE todos SET title = ?, description = ?, date = ?, time = ?, priority = ?, completed = ? WHERE id = ? AND user_id = ?'
  ).run(
    title ?? todo.title,
    description ?? todo.description,
    date ?? todo.date,
    time ?? todo.time,
    priority ?? todo.priority,
    completed ?? todo.completed,
    id,
    req.userId
  );

  const updated = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  res.json(updated);
});

app.delete('/api/todos/:id', authenticate, (req, res) => {
  const { id } = req.params;

  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(id, req.userId);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(id, req.userId);
  res.json({ success: true });
});

// SPA fallback — serve index.html for any non-API route (production)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 PlanIt API server running on http://localhost:${PORT}`);
});
