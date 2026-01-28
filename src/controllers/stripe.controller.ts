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
            if (webhookSecret && signature && stripe) {
                // Verify signature if secret is configured
                event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
            } else {
                if (!stripe && process.env.NODE_ENV === 'production') {
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
            const { data, error } = await supabase.functions.invoke('stripe-webhook', {
                body: req.body, // Send the raw Buffer
                headers: {
                    'Stripe-Signature': signature || '',
                    // specific headers for file/buffer transfer if needed, but invoke handles it.
                }
            });


            if (error) {
                console.error('[Stripe] Error forwarding to Supabase:', error);

                // Detailed logging for debugging
                if (error instanceof Error) {
                    console.error('[Stripe] Error Message:', error.message);
                    console.error('[Stripe] Error Stack:', error.stack);
                }
                // If it's a FunctionsHttpError, it might have context
                if ((error as any).context) {
                    console.error('[Stripe] Function Context:', JSON.stringify((error as any).context));
                }

                // We still fail to let Stripe know something went wrong, 
                // so it might retry if it's a transient issue.
                res.status(500).json({ error: 'Failed to forward event to Supabase', details: error });
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
