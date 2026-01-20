import * as dotenv from 'dotenv';
import * as path from 'path';

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

app.get('/health', (req, res) => {
    res.send('Athplan Bridge is healthy');
});

// Start server
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}

export default app;
