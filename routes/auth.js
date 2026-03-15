const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { JWT_SECRET } = require('../middleware');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email=? OR username=?').get(email, username);
    if (existing) return res.status(409).json({ error: 'Email or username already taken' });
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, username, email, password) VALUES (?,?,?,?)').run(id, username, email, hashed);
    const token = jwt.sign({ id, username, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, username, email, plan: 'free' } });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, plan: user.plan } });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', require('../middleware').authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, email, plan, created_at FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
```

Commit it.

---

**File 2:** Click **"Add file" → "Create new file"**, type:
```
routes/bots.js
