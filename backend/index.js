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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`AgendaIA backend running on port ${PORT}`));
