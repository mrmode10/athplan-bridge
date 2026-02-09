
import 'dotenv/config';
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
    console.error('CRITICAL: STRIPE_SECRET_KEY is missing from .env');
    process.exit(1);
}

const stripe = new Stripe(key, {
    apiVersion: '2026-01-28.clover', // Match installed package version
});

async function main() {
    console.log('Creating Stripe Account with special configuration...');

    try {
        // 1. Create the Account
        // @ts-ignore - v2 types might need specific casting
        const account = await stripe.v2.core.accounts.create({
            identity: {
                country: 'lt',
            },
            dashboard: 'full',
            defaults: {
                responsibilities: {
                    losses_collector: 'stripe',
                    fees_collector: 'stripe',
                },
            },
            display_name: 'Athplan EU Pending',
            contact_email: 'testaccount@example.com',
            configuration: {
                merchant: {
                    capabilities: {
                        card_payments: {
                            requested: true,
                        },
                    },
                },
                customer: {
                    capabilities: {
                        automatic_indirect_tax: {
                            requested: true,
                        },
                    },
                },
            },
            include: [
                'configuration.merchant',
                'configuration.recipient',
                'identity',
                'defaults',
                'configuration.customer',
            ],
        });

        console.log('✅ Account Created Successfully!');
        console.log(`Account ID: ${account.id}`);

        // 2. Create Account Link for Onboarding
        console.log('Generating Account Onboarding Link...');

        // @ts-ignore
        const accountLink = await stripe.v2.core.accountLinks.create({
            account: account.id,
            use_case: {
                type: 'account_onboarding',
                account_onboarding: {
                    configurations: ['merchant', 'customer'],
                    refresh_url: 'https://dashboard.stripe.com/workbench/blueprints/learn-accounts-v2/create-account-chapter?confirmation-redirect=create-account-link',
                    return_url: 'https://dashboard.stripe.com/workbench/blueprints/learn-accounts-v2/create-account-chapter?confirmation-redirect=create-account-link',
                },
            },
        });

        console.log('✅ Account Link Generated!');
        console.log('---------------------------------------------------');
        console.log(`Onboarding URL: ${accountLink.url}`);
        console.log('---------------------------------------------------');

    } catch (error: any) {
        console.error('❌ Error:', error);
        if (error.raw) {
            console.error(JSON.stringify(error.raw, null, 2));
        }
    }
}

main();
