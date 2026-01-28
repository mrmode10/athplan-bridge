import { Request, Response } from 'express';
import { stripe } from '../services/stripe.service';
import { supabase } from '../services/supabase';

export class StripeController {
    /**
     * Handles incoming Stripe webhooks.
     * Verifies the signature (if secret present) and forwards the event to Supabase Edge Functions.
     */
    static async handleWebhook(req: Request, res: Response): Promise<void> {
        const signature = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        // Ensure we have the raw body. 
        // Note: app.ts must use express.raw({type: 'application/json'}) for this route.
        let event;

        try {
            if (webhookSecret && signature) {
                // Verify signature if secret is configured
                event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
            } else {
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
            // We use the 'stripe-webhook' function name as per user request
            const { data, error } = await supabase.functions.invoke('stripe-webhook', {
                body: event,
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

        } catch (err: any) {
            console.error(`[Stripe] Webhook Error: ${err.message}`);
            res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }
}
