const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db/postgres');

// Prueba conexión a PostgreSQL
router.get('/db', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW() as time');
    res.json({ ok: true, time: rows[0].time });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Prueba conexión a Ollama / Mistral
router.post('/agent', async (req, res) => {
  const { message = '¿Puedes saludarme en español?' } = req.body;
  try {
    const response = await axios.post(
      `${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/chat`,
      {
        model: process.env.OLLAMA_MODEL || 'mistral',
        messages: [{ role: 'user', content: message }],
        stream: false,
      },
      { timeout: 60000 }
    );
    res.json({ ok: true, reply: response.data.message.content });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
