"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeController = void 0;
const stripe_service_1 = require("../services/stripe.service");
const supabase_1 = require("../services/supabase");
class StripeController {
    static createCheckoutSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Default to localhost for dev if not provided (or configured base URL)
                const returnUrlBase = req.body.returnUrlBase || 'https://athplan.com';
                const session = yield (0, stripe_service_1.createCheckoutSession)(returnUrlBase);
                res.json(session);
            }
            catch (error) {
                console.error('[Stripe] Error creating checkout session:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }
    /**
     * Handles incoming Stripe webhooks.

     * Verifies the signature (if secret present) and forwards the event to Supabase Edge Functions.
     */
    static handleWebhook(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const signatureHeader = req.headers['stripe-signature'];
            const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
            // Ensure we have the raw body. 
            // Note: app.ts must use express.raw({type: 'application/json'}) for this route.
            let event;
            try {
                if (webhookSecret && signature && stripe_service_1.stripe) {
                    // Verify signature if secret is configured
                    event = stripe_service_1.stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
                }
                else {
                    if (!stripe_service_1.stripe && process.env.NODE_ENV === 'production') {
                        console.error('❌ Stripe client is not initialized due to missing STRIPE_SECRET_KEY.');
                        res.status(500).json({ error: 'Stripe configuration missing' });
                        return;
                    }
                    // FALLBACK for dev/test without signature verification
                    // In production, you SHOULD enforce signature verification.
                    // We'll warn if we're skipping it.
                    if (process.env.NODE_ENV === 'production') {
                        console.warn('⚠️ [Stripe] Webhook received without signature verification in PRODUCTION!');
                    }
                    // Parse the body if it's a buffer (from express.raw)
                    event = req.body instanceof Buffer ? JSON.parse(req.body.toString('utf8')) : req.body;
                }
                console.log(`[Stripe] Received event: ${event.type}`);
                // Forward to Supabase Edge Function
                // We verify it here, but we also forward the raw components so the Edge Function
                // can treat it as a standard webhook request (e.g. if it verifies signature too).
                const { data, error } = yield supabase_1.supabase.functions.invoke('stripe-webhook', {
                    body: req.body, // Send the raw Buffer
                    headers: {
                        'Stripe-Signature': signature || '',
                        // specific headers for file/buffer transfer if needed, but invoke handles it.
                    }
                });
                if (error) {
                    console.error('[Stripe] Error forwarding to Supabase:', error);
                    // We still fail to let Stripe know something went wrong, 
                    // so it might retry if it's a transient issue.
                    res.status(500).json({ error: 'Failed to forward event to Supabase' });
                    return;
                }
                console.log('[Stripe] Successfully forwarded event to Supabase.');
                res.json({ received: true, supabaseResponse: data });
            }
            catch (err) {
                console.error(`[Stripe] Webhook Error: ${err.message}`);
                res.status(400).send(`Webhook Error: ${err.message}`);
            }
        });
    }
}
exports.StripeController = StripeController;
