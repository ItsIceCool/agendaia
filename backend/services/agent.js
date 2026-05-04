const axios = require('axios');
const db = require('../db/postgres');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'mistral:7b';

async function askMistral(prompt) {
  const response = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    { model: MODEL, prompt, stream: false },
    { timeout: 300000 }
  );
  return response.data.response;
}

async function handleIncomingMessage({ negocio, from, text }) {
  const { rows: history } = await db.query(
    `SELECT rol, contenido FROM conversaciones
     WHERE negocio_id = $1 AND cliente_whatsapp = $2
     ORDER BY created_at ASC LIMIT 20`,
    [negocio.id, from]
  );

  const historyText = history
    .map((r) => `${r.rol === 'user' ? 'Cliente' : 'Asistente'}: ${r.contenido}`)
    .join('\n');

  const prompt = buildPrompt({ negocio, historyText, userMessage: text });
  const respuesta = await askMistral(prompt);

  await db.query(
    `INSERT INTO conversaciones (negocio_id, cliente_whatsapp, rol, contenido)
     VALUES ($1, $2, 'user', $3), ($1, $2, 'assistant', $4)`,
    [negocio.id, from, text, respuesta]
  );

  return respuesta;
}

function buildPrompt({ negocio, historyText, userMessage }) {
  const horarios = JSON.stringify(negocio.horarios, null, 2);
  return `${negocio.prompt_personalizado || 'Eres un asistente de agendamiento amable y profesional.'}

Negocio: ${negocio.nombre}
Horarios de atención:
${horarios}

Tu rol es ayudar a los clientes a agendar, reagendar o cancelar citas.
Cuando el cliente quiera agendar, pregunta: nombre, servicio, fecha y hora preferida.
Responde siempre en español, de forma breve y clara.

${historyText ? `Conversación previa:\n${historyText}\n` : ''}Cliente: ${userMessage}
Asistente:`;
}

module.exports = { handleIncomingMessage, askMistral };
