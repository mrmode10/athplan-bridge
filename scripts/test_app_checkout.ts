
import 'dotenv/config';
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
    console.error('CRITICAL: STRIPE_SECRET_KEY is missing from .env');
    process.exit(1);
}

const stripe = new Stripe(key, {
    apiVersion: '2026-01-28.clover',
});

async function main() {
    console.log('🚀 Starting App Checkout Test (Platform Account)...');

    try {
        console.log('\nCreating Checkout Session (EUR)...');

        // This logic mimics app.ts /create-checkout-session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur', // Converted to EUR
                        product_data: {
                            name: 'Starter Subscription (Test)',
                        },
                        unit_amount: 9900, // €99.00
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment', // mimicking app.ts current mode
            success_url: 'https://athplan.com/dashboard?success=true',
            cancel_url: 'https://athplan.com/dashboard?canceled=true',
            customer_email: 'test_user@example.com',
        });

        console.log('✅ App Checkout Session Created!');
        console.log('---------------------------------------------------');
        console.log(`URL: ${session.url}`);
        console.log('---------------------------------------------------');

    } catch (error: any) {
        console.error('❌ Error during app checkout test:', error);
    }
}

main();
