console.log('[STARTUP] App loading...');
console.log('[STARTUP] Node version:', process.version);
console.log('[STARTUP] PORT env:', process.env.PORT);

import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import { TwilioController } from './controllers/twilio.controller';
import { validateTwilioSignature } from './middleware/twilio.middleware';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
// Use provided port or default to 3000
const port = process.env.PORT || 3000;

console.log(`[STARTUP] Configured port: ${port}`);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ULTRA-SIMPLE Health Check (as requested)
app.get('/', (req, res) => {
    console.log('[REQUEST] GET /');
    res.status(200).send('OK');
});

app.get('/health', (req, res) => {
    console.log('[REQUEST] GET /health');
    res.status(200).json({ status: 'ok' });
});

// Twilio Webhook
app.post('/whatsapp', validateTwilioSignature, TwilioController.handleWebhook);

// EXPLICIT BINDING to 0.0.0.0 (as requested)
app.listen(Number(port), '0.0.0.0', () => {
    console.log(`[STARTUP] ✅ Server running on port ${port}`);
});

export default app;
