const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

// GET todos los negocios
router.get('/negocios', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, nombre, whatsapp FROM negocios ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET conversaciones recientes de un negocio
router.get('/:negocioId/conversaciones', async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { rows } = await db.query(
      `SELECT cliente_whatsapp,
              MAX(created_at) as ultima_fecha,
              COUNT(*) as total_mensajes,
              (SELECT contenido FROM conversaciones c2
               WHERE c2.negocio_id = c.negocio_id AND c2.cliente_whatsapp = c.cliente_whatsapp
               ORDER BY created_at DESC LIMIT 1) as ultimo_mensaje
       FROM conversaciones c
       WHERE negocio_id = $1
       GROUP BY negocio_id, cliente_whatsapp
       ORDER BY ultima_fecha DESC`,
      [negocioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET citas de un negocio
router.get('/:negocioId/citas', async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { rows } = await db.query(
      'SELECT * FROM citas WHERE negocio_id = $1 ORDER BY fecha_hora ASC',
      [negocioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET clientes de un negocio
router.get('/:negocioId/clientes', async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { rows } = await db.query(
      'SELECT * FROM clientes WHERE negocio_id = $1 ORDER BY nombre ASC',
      [negocioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH actualizar estado de una cita
router.patch('/citas/:citaId', async (req, res) => {
  try {
    const { citaId } = req.params;
    const { estado } = req.body;
    const { rows } = await db.query(
      'UPDATE citas SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, citaId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
