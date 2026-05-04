require('dotenv').config();
const express = require('express');
const webhookRouter = require('./routes/webhook');
const adminRouter = require('./routes/admin');
const testRouter = require('./routes/test');

const app = express();
app.use(express.json());

app.use('/webhook', webhookRouter);
app.use('/api/admin', adminRouter);
app.use('/api/test', testRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Política de Privacidad - AgendaIA</title>
  <style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}</style></head>
  <body><h1>Política de Privacidad</h1><p><strong>AgendaIA</strong> — Última actualización: Mayo 2025</p>
  <h2>Información que recopilamos</h2>
  <p>Recopilamos el número de teléfono de WhatsApp y los mensajes enviados por los usuarios para proveer el servicio de agendamiento de citas.</p>
  <h2>Uso de la información</h2>
  <p>La información se usa exclusivamente para agendar, modificar o cancelar citas con el negocio correspondiente. No compartimos datos con terceros.</p>
  <h2>Retención de datos</h2>
  <p>Los datos de conversación se almacenan por 90 días y luego son eliminados automáticamente.</p>
  <h2>Contacto</h2>
  <p>Para dudas sobre privacidad: carloscedricklabougle@gmail.com</p></body></html>`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`AgendaIA backend running on port ${PORT}`));
