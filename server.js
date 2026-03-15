require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const botRoutes = require('./routes/bots');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

initDb();

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads', { recursive: true });

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'frontend/public')));

app.use('/api/auth', authRoutes);
app.use('/api/bots', botRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`100Hosting running on port ${PORT}`);
});
