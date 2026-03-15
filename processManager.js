const { spawn } = require('child_process');
const { getDb } = require('./db');

const processes = {};

function addLog(botId, message, level = 'info') {
  try {
    const db = getDb();
    db.prepare('INSERT INTO bot_logs (bot_id, message, level) VALUES (?,?,?)').run(botId, message, level);
    db.prepare('DELETE FROM bot_logs WHERE bot_id=? AND id NOT IN (SELECT id FROM bot_logs WHERE bot_id=? ORDER BY id DESC LIMIT 200)').run(botId, botId);
  } catch (e) {}
}

function startBot(botId, filePath, token) {
  if (processes[botId]) return { ok: false, error: 'Already running' };
  const env = { ...process.env, BOT_TOKEN: token, POWERED_BY: '100Hosting' };
  let child;
  try {
    child = spawn('node', [filePath], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return { ok: false, error: 'Failed to spawn process' };
  }
  processes[botId] = child;
  const db = getDb();
  db.prepare("UPDATE bots SET status='online', pid=? WHERE id=?").run(child.pid, botId);
  addLog(botId, `Bot started (PID ${child.pid})`, 'info');
  child.stdout.on('data', (data) => { addLog(botId, data.toString().trim(), 'info'); });
  child.stderr.on('data', (data) => { addLog(botId, data.toString().trim(), 'error'); });
  child.on('exit', (code) => {
    delete processes[botId];
    try {
      const db = getDb();
      db.prepare("UPDATE bots SET status='offline', pid=NULL WHERE id=?").run(botId);
      addLog(botId, `Bot exited with code ${code}`, code === 0 ? 'info' : 'error');
    } catch (e) {}
  });
  child.on('error', (err) => {
    delete processes[botId];
    try {
      const db = getDb();
      db.prepare("UPDATE bots SET status='offline', pid=NULL WHERE id=?").run(botId);
      addLog(botId, `Process error: ${err.message}`, 'error');
    } catch (e) {}
  });
  return { ok: true, pid: child.pid };
}

function stopBot(botId) {
  const child = processes[botId];
  if (!child) return { ok: false, error: 'Not running' };
  child.kill('SIGTERM');
  delete processes[botId];
  const db = getDb();
  db.prepare("UPDATE bots SET status='offline', pid=NULL WHERE id=?").run(botId);
  addLog(botId, 'Bot stopped by user', 'info');
  return { ok: true };
}

function isRunning(botId) { return !!processes[botId]; }

module.exports = { startBot, stopBot, isRunning, addLog };
