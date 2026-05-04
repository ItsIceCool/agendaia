const axios = require('axios');
const db = require('../db/postgres');
const { getAvailableSlots, createEvent } = require('./calendar');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'mistral';

async function askMistral(systemPrompt, conversationHistory) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
  ];

  const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
    model: MODEL,
    messages,
    stream: false,
  });

  return response.data.message.content;
}

async function handleIncomingMessage({ negocio, from, text }) {
  // Recuperar historial de conversación del cliente
  const { rows: history } = await db.query(
    `SELECT rol, contenido FROM conversaciones
     WHERE negocio_id = $1 AND cliente_whatsapp = $2
     ORDER BY created_at ASC LIMIT 20`,
    [negocio.id, from]
  );

  const conversationHistory = history.map((r) => ({
    role: r.rol,
    content: r.contenido,
  }));
  conversationHistory.push({ role: 'user', content: text });

  const systemPrompt = buildSystemPrompt(negocio);
  const respuesta = await askMistral(systemPrompt, conversationHistory);

  // Guardar turno del usuario y respuesta del agente
  await db.query(
    `INSERT INTO conversaciones (negocio_id, cliente_whatsapp, rol, contenido)
     VALUES ($1, $2, 'user', $3), ($1, $2, 'assistant', $4)`,
    [negocio.id, from, text, respuesta]
  );

  return respuesta;
}

function buildSystemPrompt(negocio) {
  const horarios = JSON.stringify(negocio.horarios, null, 2);
  return `${negocio.prompt_personalizado || 'Eres un asistente de agendamiento amable y profesional.'}

Negocio: ${negocio.nombre}
Horarios de atención:
${horarios}

Tu rol es ayudar a los clientes a agendar, reagendar o cancelar citas.
Cuando el cliente quiera agendar, pregunta: nombre, servicio, fecha y hora preferida.
Responde siempre en español, de forma breve y clara.`;
}

module.exports = { handleIncomingMessage };
