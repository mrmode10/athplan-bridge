import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express from 'express';
import { TwilioController } from './controllers/twilio.controller';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse urlencoded bodies (as sent by Twilio)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

import { validateTwilioSignature } from './middleware/twilio.middleware';

// Routes
// Apply middleware to this route specifically
app.post('/whatsapp', validateTwilioSignature, TwilioController.handleWebhook);

import { supabase } from './services/supabase';

app.get('/health', (req, res) => {
    if (!supabase) {
        res.status(503).send('Service unavailable: Supabase not initialized');
        return;
    }
    res.status(200).send('Athplan Bridge is healthy');
});

// Start server
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}

export default app;
