const axios = require('axios');
const db = require('../db/postgres');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'mistral:7b';

async function askMistral(prompt) {
  const response = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    {
      model: MODEL,
      prompt,
      stream: false,
      options: { num_predict: 250, temperature: 0.7 },
    },
    { timeout: 60000 }
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
  let respuesta = await askMistral(prompt);

  // Extract appointment data if the AI included the AGENDA marker
  const agendaMatch = respuesta.match(/AGENDA:(\{[\s\S]*?\})/);
  if (agendaMatch) {
    try {
      const data = JSON.parse(agendaMatch[1]);
      await guardarCita({ negocio, from, ...data });
      console.log(`✅ Cita guardada automáticamente para ${from}:`, data);
    } catch (e) {
      console.error('⚠️  AGENDA JSON inválido:', agendaMatch[1], e.message);
    }
    // Strip the AGENDA line before sending to the client
    respuesta = respuesta.replace(/\n?AGENDA:\{[\s\S]*?\}/, '').trim();
  }

  await db.query(
    `INSERT INTO conversaciones (negocio_id, cliente_whatsapp, rol, contenido)
     VALUES ($1, $2, 'user', $3), ($1, $2, 'assistant', $4)`,
    [negocio.id, from, text, respuesta]
  );

  return respuesta;
}

async function guardarCita({ negocio, from, cliente_nombre, servicio, fecha_hora }) {
  // Upsert cliente
  await db.query(
    `INSERT INTO clientes (negocio_id, nombre, whatsapp)
     VALUES ($1, $2, $3)
     ON CONFLICT (negocio_id, whatsapp) DO UPDATE SET nombre = EXCLUDED.nombre`,
    [negocio.id, cliente_nombre, from]
  );

  // Insert cita
  await db.query(
    `INSERT INTO citas (negocio_id, cliente_nombre, cliente_whatsapp, servicio, fecha_hora, estado)
     VALUES ($1, $2, $3, $4, $5, 'pendiente')`,
    [negocio.id, cliente_nombre, from, servicio, fecha_hora]
  );
}

function buildPrompt({ negocio, historyText, userMessage }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const horarios = JSON.stringify(negocio.horarios, null, 2);

  return `${negocio.prompt_personalizado || 'Eres un asistente de agendamiento amable y profesional.'}

Negocio: ${negocio.nombre}
Fecha de hoy: ${hoy}
Horarios de atención:
${horarios}

Tu trabajo es ayudar a los clientes a agendar citas. Para agendar necesitas: nombre completo, servicio, fecha y hora.
Haz UNA pregunta a la vez hasta tener todos los datos.
Responde SIEMPRE en español, máximo 2 oraciones. Sin listas ni explicaciones largas.

REGLA IMPORTANTE: Cuando ya tengas nombre, servicio, fecha Y hora confirmados por el cliente, al final de tu respuesta agrega exactamente esta línea (sin espacios extra):
AGENDA:{"cliente_nombre":"NOMBRE","servicio":"SERVICIO","fecha_hora":"YYYY-MM-DD HH:MM","notas":""}
Solo agrégala cuando tengas TODOS los datos. No la inventes si faltan datos.

${historyText ? `Conversación previa:\n${historyText}\n` : ''}Cliente: ${userMessage}
Asistente:`;
}

module.exports = { handleIncomingMessage, askMistral };
