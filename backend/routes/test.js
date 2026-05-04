const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { askMistral } = require('../services/agent');

router.get('/db', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW() as time');
    res.json({ ok: true, time: rows[0].time });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/agent', async (req, res) => {
  const { message = 'Hola, ¿cómo estás?' } = req.body;
  try {
    const reply = await askMistral(message);
    res.json({ ok: true, reply });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
