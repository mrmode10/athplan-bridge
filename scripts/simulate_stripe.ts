import axios from 'axios';

const PORT = 3000;
const URL = `http://localhost:${PORT}/stripe-webhook`;

async function simulateStripeWebhook() {
    const event = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'customer.subscription.created',
        data: {
            object: {
                id: 'sub_12345',
                customer: 'cus_test_user',
                status: 'active',
            },
        },
    };

    try {
        console.log('Sending mock Stripe webhook event...');
        // We do not send stripe-signature header, so it should trigger the fallback logic and warn in console
        const response = await axios.post(URL, event, {
            headers: { 'Content-Type': 'application/json' },
        });

        console.log('✅ Response Status:', response.status);
        console.log('✅ Response Body:', response.data);
    } catch (error: any) {
        if (error.response) {
            console.error('❌ Error Status:', error.response.status);
            console.error('❌ Error Data:', error.response.data);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

simulateStripeWebhook();
