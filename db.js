const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
let db;

function getDb() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

function initDb() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      token TEXT NOT NULL,
      file_path TEXT,
      status TEXT DEFAULT 'offline',
      pid INTEGER,
      servers INTEGER DEFAULT 0,
      ping INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS bot_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id TEXT NOT NULL,
      message TEXT NOT NULL,
      level TEXT DEFAULT 'info',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY(bot_id) REFERENCES bots(id)
    );
  `);
  console.log('Database initialized');
}

module.exports = { getDb, initDb };
