const express = require('express');
const router = express.Router();
const { handleIncomingMessage } = require('../services/agent');
const { sendMessage } = require('../services/whatsapp');
const db = require('../db/postgres');

// Verificación del webhook con Meta
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Recibir mensajes de WhatsApp
router.post('/', async (req, res) => {
  res.sendStatus(200); // Responder a Meta de inmediato

  console.log('📩 Webhook recibido:', JSON.stringify(req.body, null, 2));

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.messages?.length) {
      console.log('⚠️ Sin mensajes en el payload, ignorando.');
      return;
    }

    const phoneNumberId = value.metadata.phone_number_id;
    const message = value.messages[0];
    const from = message.from;
    const text = message.text?.body;

    console.log(`📱 Mensaje de ${from} a phoneId ${phoneNumberId}: "${text}"`);

    if (!text) return;

    // Identificar negocio por phone_number_id
    const { rows } = await db.query(
      'SELECT * FROM negocios WHERE whatsapp_phone_id = $1',
      [phoneNumberId]
    );
    console.log(`🏪 Negocio encontrado: ${rows.length > 0 ? rows[0].nombre : 'NINGUNO'}`);
    if (!rows.length) return;

    const negocio = rows[0];
    const respuesta = await handleIncomingMessage({ negocio, from, text });
    console.log(`🤖 Respuesta del agente: "${respuesta}"`);
    await sendMessage({ phoneNumberId, to: from, message: respuesta });
    console.log('✅ Mensaje enviado a WhatsApp');
  } catch (err) {
    console.error('❌ Error en webhook:', err.message);
  }
});

module.exports = router;
