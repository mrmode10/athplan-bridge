
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
});

const WEBHOOK_URL = 'https://api.athplan.com/webhook';

async function setupStripe() {
    console.log('🚀 Setting up Stripe for Athplan...\n');

    // 1. Create Products and Prices
    const tiers = [
        { name: 'Starter Pack', price: 9900, users: 8 },    // €99
        { name: 'All Star', price: 19900, users: 20 },      // €199
        { name: 'Hall of Fame', price: 24900, users: 30 },  // €249
    ];

    console.log('📦 Creating Products & Prices...');
    const createdPrices: { name: string; priceId: string }[] = [];

    for (const tier of tiers) {
        // Check if product already exists
        const existingProducts = await stripe.products.list({ limit: 100 });
        let product = existingProducts.data.find(p => p.name === tier.name && p.active);

        if (!product) {
            product = await stripe.products.create({
                name: tier.name,
                description: `Athplan ${tier.name} - Up to ${tier.users} users`,
                metadata: { max_users: tier.users.toString() }
            });
            console.log(`   ✅ Created product: ${tier.name}`);
        } else {
            console.log(`   ⏩ Product exists: ${tier.name}`);
        }

        // Check if price exists for this product
        const existingPrices = await stripe.prices.list({ product: product.id, active: true });
        let price = existingPrices.data.find(p => p.unit_amount === tier.price && p.currency === 'eur');

        if (!price) {
            price = await stripe.prices.create({
                product: product.id,
                unit_amount: tier.price,
                currency: 'eur',
                recurring: { interval: 'month' },
                metadata: { tier_name: tier.name }
            });
            console.log(`   ✅ Created price: €${tier.price / 100}/month for ${tier.name}`);
        } else {
            console.log(`   ⏩ Price exists: €${tier.price / 100}/month for ${tier.name}`);
        }

        createdPrices.push({ name: tier.name, priceId: price.id });
    }

    // 2. Create Webhook Endpoint
    console.log('\n🔗 Configuring Webhook...');
    const webhooks = await stripe.webhookEndpoints.list({ limit: 20 });
    let webhook = webhooks.data.find(w => w.url === WEBHOOK_URL);

    if (!webhook) {
        webhook = await stripe.webhookEndpoints.create({
            url: WEBHOOK_URL,
            enabled_events: [
                'checkout.session.completed',
                'customer.subscription.created',
                'customer.subscription.updated',
                'customer.subscription.deleted',
                'invoice.payment_succeeded',
                'invoice.payment_failed',
            ],
        });
        console.log(`   ✅ Created webhook: ${WEBHOOK_URL}`);
        console.log(`   🔑 Webhook Secret: ${webhook.secret}`);
        console.log(`   ⚠️  IMPORTANT: Update STRIPE_WEBHOOK_SECRET in your .env with this value!`);
    } else {
        console.log(`   ⏩ Webhook already exists: ${WEBHOOK_URL}`);
    }

    // 3. Summary
    console.log('\n\n========================================');
    console.log('✅ STRIPE SETUP COMPLETE');
    console.log('========================================\n');

    console.log('📋 Price IDs for your backend:');
    for (const p of createdPrices) {
        console.log(`   ${p.name}: ${p.priceId}`);
    }

    console.log('\n📝 Next Steps:');
    console.log('   1. Update your backend to use these price IDs');
    console.log('   2. Ensure STRIPE_WEBHOOK_SECRET is set in .env');
    console.log('   3. Deploy your backend to Hostinger');
    console.log('   4. Test a checkout flow!');
}

setupStripe().catch(console.error);
