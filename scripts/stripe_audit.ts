
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
});

async function auditStripe() {
    console.log('🔍 Auditing Stripe Account...\n');

    // 1. Account Info
    try {
        const account = await stripe.accounts.retrieve();
        console.log('✅ Account ID:', account.id || 'Platform Account');
        console.log('   Country:', (account as any).country || 'N/A');
        console.log('   Business Name:', (account as any).business_profile?.name || 'Not set');
    } catch (e: any) {
        // If this is the platform account, retrieve won't work the same way
        console.log('✅ Connected to Stripe Platform Account');
    }

    // 2. Products
    console.log('\n📦 Products:');
    const products = await stripe.products.list({ limit: 20, active: true });
    if (products.data.length === 0) {
        console.log('   ⚠️  No products found. You need to create products for your tiers.');
    } else {
        for (const product of products.data) {
            console.log(`   - ${product.name} (${product.id})`);
        }
    }

    // 3. Prices
    console.log('\n💰 Prices:');
    const prices = await stripe.prices.list({ limit: 20, active: true });
    if (prices.data.length === 0) {
        console.log('   ⚠️  No prices found. You need to create prices for your products.');
    } else {
        for (const price of prices.data) {
            const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
            const currency = price.currency.toUpperCase();
            const interval = price.recurring?.interval || 'one-time';
            console.log(`   - ${price.id}: ${currency} ${amount} / ${interval}`);
        }
    }

    // 4. Webhooks
    console.log('\n🔗 Webhook Endpoints:');
    const webhooks = await stripe.webhookEndpoints.list({ limit: 20 });
    if (webhooks.data.length === 0) {
        console.log('   ⚠️  No webhooks configured! You need to add a webhook endpoint.');
    } else {
        for (const wh of webhooks.data) {
            console.log(`   - ${wh.url}`);
            console.log(`     Status: ${wh.status}`);
            console.log(`     Events: ${wh.enabled_events?.slice(0, 3).join(', ')}${(wh.enabled_events?.length || 0) > 3 ? '...' : ''}`);
        }
    }

    // 5. Recent Customers
    console.log('\n👥 Recent Customers (last 5):');
    const customers = await stripe.customers.list({ limit: 5 });
    if (customers.data.length === 0) {
        console.log('   No customers yet.');
    } else {
        for (const cust of customers.data) {
            console.log(`   - ${cust.email || cust.id}`);
        }
    }

    console.log('\n✅ Audit Complete!\n');
}

auditStripe().catch(console.error);
