import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express from 'express';
import { TwilioController } from './controllers/twilio.controller';
import { validateTwilioSignature } from './middleware/twilio.middleware';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse urlencoded bodies (as sent by Twilio)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Health check routes - MUST return 200 for Hostinger to consider app healthy
app.get('/', (req, res) => {
    res.status(200).send('OK');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Twilio WhatsApp webhook route
app.post('/whatsapp', validateTwilioSignature, TwilioController.handleWebhook);

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

export default app;
