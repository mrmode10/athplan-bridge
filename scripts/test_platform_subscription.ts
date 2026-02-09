
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
    console.log('🚀 Starting Platform Billing Test...');

    try {
        // 1. Create Price
        // We'll use a hardcoded price or create one on the fly for the test
        console.log('\nCreating/Retrieving Price...');
        // Create a dedicated product/price for this billing test to keep it clean
        const product = await stripe.products.create({
            name: 'Athplan Platform Fees',
        });
        const price = await stripe.prices.create({
            unit_amount: 1000,
            currency: 'eur',
            recurring: { interval: 'month' },
            product: product.id,
        });
        console.log(`✅ Price Created: ${price.id}`);

        // 2. Create SetupIntent to authorize debiting the Connected Account Balance
        console.log(`\nCreating SetupIntent for Account: ${CONNECTED_ACCOUNT_ID}...`);

        // Note: creating a SetupIntent on the *Platform* account, but `customer_account` points to the connected one?
        // Wait, the documentation/snippet says:
        /*
        const setupIntent = await stripe.setupIntents.create({
            payment_method_types: ['stripe_balance'],
            confirm: true,
            customer_account: '{{id}}', // The connected account ID
            ...
        });
        */

        // @ts-ignore
        const setupIntent = await stripe.setupIntents.create({
            payment_method_types: ['stripe_balance'],
            confirm: true,
            // 'customer_account' parameter is specific to this flow (Stripe Connect embedded payments / billing)
            // It might not be in standard types yet or is part of 'on_behalf_of' logic?
            // The snippet explicitly used `customer_account: '{{id}}'`.
            // Let's assume the key is exactly `customer_account`.
            customer_account: CONNECTED_ACCOUNT_ID,
            usage: 'off_session',
            payment_method_data: {
                type: 'stripe_balance',
            },
        });

        console.log('✅ SetupIntent Created & Confirmed!');
        console.log(`   ID: ${setupIntent.id}`);
        console.log(`   Payment Method: ${setupIntent.payment_method}`);

        const paymentMethodId = typeof setupIntent.payment_method === 'string'
            ? setupIntent.payment_method
            : setupIntent.payment_method?.id;

        if (!paymentMethodId) {
            throw new Error('Failed to retrieve Payment Method ID from SetupIntent');
        }

        // 3. Create Subscription charging that Payment Method
        console.log('\nCreating Subscription...');
        // @ts-ignore
        const subscription = await stripe.subscriptions.create({
            customer_account: CONNECTED_ACCOUNT_ID, // Use customer_account instead of customer? Or customer == account ID?
            // The snippet says: `customer_account: '{{id}}'`
            default_payment_method: paymentMethodId,
            items: [
                {
                    price: price.id,
                    quantity: 1,
                },
            ],
            payment_settings: {
                payment_method_types: ['stripe_balance'],
            },
        });

        console.log('✅ Subscription Created Successfully!');
        console.log('---------------------------------------------------');
        console.log(`Subscription ID: ${subscription.id}`);
        console.log(`Status: ${subscription.status}`);
        console.log('---------------------------------------------------');

    } catch (error: any) {
        console.error('❌ Error during billing test:', error);
        if (error.raw) {
            console.error(JSON.stringify(error.raw, null, 2));
        }
    }
}

main();
