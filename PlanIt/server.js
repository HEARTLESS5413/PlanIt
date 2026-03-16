import express from 'express';
import pg from 'pg';
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
const distPath = join(__dirname, 'dist');
console.log(`📂 Serving static files from: ${distPath}`);
app.use(express.static(distPath));

// ============ PostgreSQL Database Setup ============
const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        date TEXT NOT NULL,
        time TEXT DEFAULT '',
        priority TEXT DEFAULT 'medium',
        completed INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('❌ Database init error:', err.message);
  } finally {
    client.release();
  }
}

// ============ Auth Middleware ============
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

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hashed]
    );

    const userId = result.rows[0].id;
    const token = jwt.sign({ id: userId, name, email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: userId, name, email } });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============ TODO ROUTES ============

app.get('/api/todos', authenticate, async (req, res) => {
  const { date } = req.query;

  try {
    let result;
    if (date) {
      result = await pool.query(
        'SELECT * FROM todos WHERE user_id = $1 AND date = $2 ORDER BY time ASC, created_at DESC',
        [req.userId, date]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM todos WHERE user_id = $1 ORDER BY date ASC, time ASC',
        [req.userId]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch todos error:', err.message);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.post('/api/todos', authenticate, async (req, res) => {
  const { title, description, date, time, priority } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO todos (user_id, title, description, date, time, priority) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.userId, title, description || '', date, time || '', priority || 'medium']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create todo error:', err.message);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.put('/api/todos/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, description, date, time, priority, completed } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM todos WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Todo not found' });

    const todo = existing.rows[0];
    const result = await pool.query(
      'UPDATE todos SET title = $1, description = $2, date = $3, time = $4, priority = $5, completed = $6 WHERE id = $7 AND user_id = $8 RETURNING *',
      [
        title ?? todo.title,
        description ?? todo.description,
        date ?? todo.date,
        time ?? todo.time,
        priority ?? todo.priority,
        completed ?? todo.completed,
        id,
        req.userId
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update todo error:', err.message);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM todos WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Todo not found' });

    await pool.query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete todo error:', err.message);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// SPA fallback — serve index.html for any non-API route (production)
app.get('*', (req, res) => {
  const indexFile = join(__dirname, 'dist', 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      console.error(`❌ Error sending index.html: ${err.message}`);
      res.status(404).send('PlanIt Server: Frontend build not found. Please run "npm run build" first.');
    }
  });
});

// ============ Start Server ============
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 PlanIt API server running on http://localhost:${PORT}`);
  });
});
