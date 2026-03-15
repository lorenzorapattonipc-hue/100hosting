const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware');
const { startBot, stopBot, isRunning, addLog } = require('../processManager');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads', req.user.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith('.js'))
      return cb(new Error('Only .js files allowed'));
    cb(null, true);
  }
});

// Get all bots for current user
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const bots = db.prepare('SELECT id, name, status, servers, ping, created_at FROM bots WHERE user_id=? ORDER BY created_at DESC').all(req.user.id);
  // Mask token, add running status
  const result = bots.map(b => ({ ...b, running: isRunning(b.id) }));
  res.json(result);
});

// Create bot
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  const { name, token } = req.body;
  if (!name || !token) return res.status(400).json({ error: 'Name and token required' });
  if (!req.file) return res.status(400).json({ error: 'Bot .js file required' });

  // Validate token format loosely
  if (token.split('.').length !== 3) return res.status(400).json({ error: 'Invalid bot token format' });

  const db = getDb();

  // Free plan: max 3 bots
  const count = db.prepare('SELECT COUNT(*) as c FROM bots WHERE user_id=?').get(req.user.id);
  const user = db.prepare('SELECT plan FROM users WHERE id=?').get(req.user.id);
  const limit = user.plan === 'free' ? 3 : 20;
  if (count.c >= limit) {
    fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: `Bot limit reached (${limit} on ${user.plan} plan)` });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO bots (id, user_id, name, token, file_path) VALUES (?,?,?,?,?)').run(id, req.user.id, name, token, req.file.path);
  addLog(id, `Bot "${name}" created`, 'info');

  res.json({ id, name, status: 'offline', servers: 0, ping: 0 });
});

// Delete bot
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const bot = db.prepare('SELECT * FROM bots WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  // Stop if running
  if (isRunning(bot.id)) stopBot(bot.id);

  // Remove file
  if (bot.file_path && fs.existsSync(bot.file_path)) {
    try { fs.unlinkSync(bot.file_path); } catch (e) {}
  }

  db.prepare('DELETE FROM bot_logs WHERE bot_id=?').run(bot.id);
  db.prepare('DELETE FROM bots WHERE id=?').run(bot.id);
  res.json({ ok: true });
});

// Start bot
router.post('/:id/start', authMiddleware, (req, res) => {
  const db = getDb();
  const bot = db.prepare('SELECT * FROM bots WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  if (!bot.file_path || !fs.existsSync(bot.file_path))
    return res.status(400).json({ error: 'Bot file missing. Please re-upload.' });

  const result = startBot(bot.id, bot.file_path, bot.token);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true, pid: result.pid });
});

// Stop bot
router.post('/:id/stop', authMiddleware, (req, res) => {
  const db = getDb();
  const bot = db.prepare('SELECT * FROM bots WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const result = stopBot(bot.id);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

// Get bot logs
router.get('/:id/logs', authMiddleware, (req, res) => {
  const db = getDb();
  const bot = db.prepare('SELECT id FROM bots WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const logs = db.prepare('SELECT message, level, created_at FROM bot_logs WHERE bot_id=? ORDER BY id DESC LIMIT 100').all(bot.id);
  res.json(logs.reverse());
});

module.exports = router;
