import axios from 'axios';
import crypto from 'crypto';
import qs from 'qs';

const PORT = 3000;
const URL = `http://localhost:${PORT}/whatsapp`;
const AUTH_TOKEN = 'test_token';

// We need to set TWILIO_AUTH_TOKEN in the running app to match this
// But since we can't easily change the running app's env dynamically without restart,
// We will rely on the fact that we can disable signature check locally OR mock it.
// The middleware skips if NODE_ENV=development and no PUBLIC_URL. 
// Let's assume the user runs `npm run dev` and we can hit it.

async function simulateWebhook() {
    const body = {
        From: '+15551234567',
        Body: 'Hello Athplan!',
    };

    // Convert to form-urlencoded string as Twilio does
    const data = qs.stringify(body);

    try {
        console.log('Sending message:', body);
        const response = await axios.post(URL, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Twilio-Signature': 'mock_signature', // Middleware should skip if dev logic holds
            },
        });

        console.log('Response Status:', response.status);
        console.log('Response Body:', response.data);
    } catch (error: any) {
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

simulateWebhook();
