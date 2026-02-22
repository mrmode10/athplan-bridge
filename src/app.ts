process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    console.error(err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

console.log('[STARTUP] App loading...');
console.log('[STARTUP] Node version:', process.version);
console.log('[STARTUP] PORT env:', process.env.PORT);

import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import { TwilioController } from './controllers/twilio.controller';
import { validateTwilioSignature } from './middleware/twilio.middleware';
import { supabase } from './services/supabase';
import { stripe, createPortalSession, getOrCreateCustomer } from './services/stripe.service';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { StripeController } from './controllers/stripe.controller';
import { AdminService } from './services/admin.service';
import multer from 'multer';
import { KnowledgeService } from './services/knowledge.service';

const app = express();
const upload = multer();
// Use provided port or default to 3000
const port = process.env.PORT || 3000;

app.use(cors()); // Allow all origins

// Middleware
// Raw body for Stripe Webhook - MUST come before express.json() for this specific route
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), StripeController.handleWebhook);

app.post('/create-checkout-session', express.json(), async (req, res) => {
    try {
        if (!stripe) {
            throw new Error('Stripe is not configured.');
        }

        // Map plan names to Stripe Price IDs (created via stripe_setup.ts)
        const PLAN_PRICE_IDS: Record<string, string> = {
            'Starter Pack': 'price_1SytvOLHktvXWxv0lftbH5R9',
            'All Star': 'price_1SytvPLHktvXWxv02zInfV4g',
            'Hall of Fame': 'price_1SytvQLHktvXWxv0uMvGkS71',
            // Legacy aliases
            'Starter': 'price_1SytvOLHktvXWxv0lftbH5R9',
        };

        const { email, phone, phoneNumber, plan } = req.body;
        const targetPhone = phone || phoneNumber;
        const planName = plan || 'Starter Pack';
        const priceId = PLAN_PRICE_IDS[planName];

        if (!priceId) {
            res.status(400).json({ error: `Unknown plan: ${planName}` });
            return;
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: 'https://athplan.com/dashboard?success=true',
            cancel_url: 'https://athplan.com/dashboard?canceled=true',
            customer_email: email,
            metadata: {
                user_phone: targetPhone,
                plan: planName
            }
        });

        res.json({ url: session.url, id: session.id });
    } catch (err: any) {
        console.error('Error in /create-checkout-session:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (!stripe) throw new Error('Stripe not configured');
        if (!sig || !endpointSecret) throw new Error('Missing signature or secret');

        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the "Payment Success" event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;

        // Retrieve the Phone Number we saved earlier
        const userPhone = session.metadata?.user_phone;
        console.log(`Payment success for: ${userPhone}`);

        if (userPhone) {
            // Update Supabase
            const { error } = await supabase
                .from('users')
                .update({ subscription_status: 'active' })
                .eq('phone_number', userPhone);

            if (error) console.error('Supabase update failed:', error);
        } else {
            console.warn('No user_phone found in session metadata');
        }
    }

    res.send();
});

app.post('/join-varsity', express.json(), async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        res.status(400).json({ error: 'Phone number is required.' });
        return;
    }

    try {
        console.log(`[Join Varsity] Request for: ${phoneNumber}`);

        // Update Supabase
        const { error } = await supabase
            .from('users')
            .update({ subscription_status: 'active' })
            .eq('phone_number', phoneNumber);

        if (error) {
            console.error('Supabase update failed:', error);
            res.status(500).json({ error: 'Failed to update subscription status.' });
            return;
        }

        res.json({ success: true, message: 'Welcome to Varsity!' });
    } catch (err: any) {
        console.error('Error in /join-varsity:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/upload-knowledge', upload.single('file'), async (req, res) => {
    const { groupName } = req.body;
    const file = req.file;

    if (!groupName || !file) {
        res.status(400).json({ error: 'groupName and file are required.' });
        return;
    }

    try {
        console.log(`[Upload Knowledge] Request for group: ${groupName}`);

        // Upload to Supabase Storage
        const path = await KnowledgeService.uploadFileToSupabase(groupName, file);

        // Push to Voiceflow KB
        const vfResponse = await KnowledgeService.uploadToVoiceflowKB(groupName, file);

        res.json({
            success: true,
            message: 'File uploaded successfully.',
            path,
            voiceflow: vfResponse
        });
    } catch (err: any) {
        console.error('Error in /upload-knowledge:', err);
        res.status(500).json({ error: err.message });
    }
});

// Voiceflow Schedule Update Endpoint
// Triggered by the "Update Schedule" flow in Voiceflow
app.post('/schedule-update', express.json(), async (req, res) => {
    const { group, content, sender } = req.body;

    if (!group || !content || !sender) {
        res.status(400).json({ error: 'Missing required fields: group, content, sender' });
        return;
    }

    try {
        console.log(`[Schedule Update] Request from Voiceflow for group: ${group}`);

        // Reuse the logic we built for #schedule
        const result = await AdminService.saveScheduleUpdate(
            group,
            content,
            sender
        );

        if (result.saved) {
            res.json({
                success: true,
                message: 'Schedule updated and broadcast sent.',
                broadcastCount: result.broadcastCount
            });
        } else {
            console.warn(`[Schedule Update Failed] ${result.error}`);
            res.status(403).json({ error: result.error || 'Failed to save schedule update.' });
        }
    } catch (err: any) {
        console.error('Error in /schedule-update:', err);
        res.status(500).json({ error: err.message });
    }
});



// HARDCODED CREDENTIALS REMOVED
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('⚠️ Twilio credentials missing from .env');
}

console.log(`[STARTUP] Configured port: ${port}`);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ULTRA-SIMPLE Health Check (Keep this distinct from logic-heavy status check)
app.get('/', (req, res) => {
    // console.log('[REQUEST] GET /'); // Reduce noise
    res.status(200).send('OK');
});

app.get('/health', (req, res) => {
    // console.log('[REQUEST] GET /health'); // Reduce noise
    res.status(200).json({ status: 'ok' });
});

// Full Status Endpoint (Checks dependencies)
app.get('/status', async (req, res) => {
    const status: any = {
        app: 'ok',
        twilio: 'skipped',
        supabase: 'skipped',
        time: new Date().toISOString(),
    };

    // 1. Twilio Check
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
        try {
            const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
            const account = await client.api.accounts(TWILIO_ACCOUNT_SID).fetch();
            status.twilio = account.status === 'active' ? 'ok' : `status:${account.status}`;
        } catch (err) {
            console.error('Twilio Status Check Failed:', err);
            status.twilio = 'error';
        }
    }

    // 2. Supabase Check
    if (supabase) {
        try {
            // "profiles" is a standard table, or use a lightweight query like getting user
            // Since we don't know the full schema, we'll try to just check if headers are set or make a benign call
            // Using a simple 'count' on a likely table or just authentication check if possible.
            // Let's try to list 1 row from 'users' or 'profiles' or any table. 
            // Better: just check if we can query anything. 'auth.users' is strict.
            // We'll try a harmless query. If it fails due to RLS/table missing, it's still "reachable".
            // Let's try to query a common table 'users'
            const { error, count } = await supabase.from('users').select('*', { count: 'exact', head: true });

            // If error is code '42P01' (undefined_table), Supabase is reachable but table missing. 
            // If error is network error, it's NOT reachable.
            if (error && error.code !== '42P01' && error.code !== 'PGRST116') {
                // Check if it's a connectivity error
                console.error('Supabase Status Check Error:', error);
                if (error.message && error.message.includes('fetch')) {
                    status.supabase = 'error';
                } else {
                    status.supabase = 'ok (reachable)'; // It responded, even if with an error
                }
            } else {
                status.supabase = 'ok';
            }
        } catch (err) {
            console.error('Supabase Status Check Failed:', err);
            status.supabase = 'error';
        }
    }

    // 3. Stripe Check
    if (stripe) {
        try {
            // Lightweight check: list 1 payment link to verify API key
            const links = await stripe.paymentLinks.list({ limit: 1 });
            status.stripe = 'ok';
        } catch (err: any) {
            console.error('Stripe Status Check Failed:', err);
            // Distinguish between auth error and other errors
            if (err.type === 'StripeAuthenticationError') {
                status.stripe = 'error (auth)';
            } else {
                status.stripe = 'error';
            }
        }
    }

    res.status(200).json(status);
});

app.get('/debug-config', (req, res) => {
    res.json({
        port: process.env.PORT,
        node_env: process.env.NODE_ENV,
        has_supabase_url: !!process.env.SUPABASE_URL,
        has_supabase_key: !!process.env.SUPABASE_KEY,
        has_stripe_secret: !!process.env.STRIPE_SECRET_KEY,
        cwd: process.cwd(),
        version: process.version
    });
});

// Portal Session Endpoint
app.post('/portal-session', async (req, res) => {
    try {
        const { email, name, returnUrl } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // 1. Get or Create Customer
        // In production, you would look up the user in Supabase to get their stored Stripe Customer ID.
        // For this MVP bridge, we'll look them up by email in Stripe directly.
        const customerId = await getOrCreateCustomer(email, name || 'Athplan User');

        // 2. Create Portal Session
        const url = await createPortalSession(customerId, returnUrl || 'https://athplan.com/dashboard');

        res.json({ url });
    } catch (error: any) {
        console.error('Error creating portal session:', error);
        res.status(500).json({ error: error.message });
    }
});

import { validateSubscription } from './middleware/subscription.middleware';

// Twilio Webhook
app.post('/whatsapp', validateTwilioSignature, validateSubscription, TwilioController.handleWebhook);

// EXPLICIT BINDING to 0.0.0.0
// EXPLICIT BINDING - Remove host '0.0.0.0' for Passenger compatibility (it handles binding)
// And DO NOT cast to Number() because Passenger passes a socket pipe string!
app.listen(port, () => {
    console.log(`[STARTUP] ✅ Server running on ${typeof port} ${port}`);
});

export default app;
