
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

const CONNECTED_ACCOUNT_ID = 'acct_1SxnNIPsFefrogQF';

async function main() {
    console.log('🚀 Starting Stripe Flow Test...');

    try {
        // 1. Create Platform Product
        console.log('\nCreating Platform Product...');
        const product = await stripe.products.create({
            name: 'Platform subscription',
            default_price_data: {
                currency: 'eur',
                recurring: {
                    interval: 'month',
                },
                unit_amount: 1000, // 10.00 EUR
            },
        });
        console.log('✅ Product Created:', product.id);
        console.log(`   Name: ${product.name}`);

        // 2. Create Checkout Session on Connected Account
        console.log(`\nCreating Checkout Session for Account: ${CONNECTED_ACCOUNT_ID}...`);
        const session = await stripe.checkout.sessions.create(
            {
                success_url: 'https://dashboard.stripe.com/workbench/blueprints/learn-accounts-v2/accept-embedded-payments-chapter?confirmation-redirect=create-checkout-session',
                line_items: [
                    {
                        price_data: {
                            currency: 'eur',
                            product_data: {
                                name: 'Cookie',
                            },
                            unit_amount: 100000, // 1000.00 EUR
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                payment_method_types: ['card'],
                payment_intent_data: {
                    application_fee_amount: 123, // 1.23 EUR Fee
                },
            },
            {
                stripeAccount: CONNECTED_ACCOUNT_ID,
            }
        );

        console.log('✅ Checkout Session Created!');
        console.log('---------------------------------------------------');
        console.log(`Checkout URL: ${session.url}`);
        console.log('---------------------------------------------------');

    } catch (error: any) {
        console.error('❌ Error during test flow:', error);
        if (error.raw) {
            console.error(JSON.stringify(error.raw, null, 2));
        }
    }
}

main();
