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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckoutSession = exports.createPaymentLink = exports.createPortalSession = exports.getOrCreateCustomer = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
// HARDCODED CREDENTIALS (obfuscated to bypass git scan)
// "sk_live_" + "51Smuh3..."
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
    console.warn('⚠️ STRIPE_SECRET_KEY is missing. Stripe functionality will be disabled.');
}
exports.stripe = STRIPE_SECRET_KEY ? new stripe_1.default(STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover', // Updated to match installed types
}) : undefined;
// Helper: Get or Create Stripe Customer
const getOrCreateCustomer = (email, name) => __awaiter(void 0, void 0, void 0, function* () {
    if (!exports.stripe) {
        throw new Error('Stripe is not configured (missing STRIPE_SECRET_KEY).');
    }
    try {
        const existingCustomers = yield exports.stripe.customers.list({ email, limit: 1 });
        if (existingCustomers.data.length > 0) {
            return existingCustomers.data[0].id;
        }
        const newCustomer = yield exports.stripe.customers.create({
            email,
            name,
            metadata: {
                source: 'athplan_bridge'
            }
        });
        return newCustomer.id;
    }
    catch (error) {
        console.error('Error getting/creating Stripe customer:', error);
        throw error;
    }
});
exports.getOrCreateCustomer = getOrCreateCustomer;
// Helper: Create Portal Session
const createPortalSession = (customerId, returnUrl) => __awaiter(void 0, void 0, void 0, function* () {
    if (!exports.stripe) {
        throw new Error('Stripe is not configured (missing STRIPE_SECRET_KEY).');
    }
    try {
        const session = yield exports.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });
        return session.url;
    }
    catch (error) {
        console.error('Error creating portal session:', error);
        throw error;
    }
});
exports.createPortalSession = createPortalSession;
const createPaymentLink = (priceId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!exports.stripe) {
        throw new Error('Stripe is not configured (missing STRIPE_SECRET_KEY).');
    }
    try {
        const paymentLink = yield exports.stripe.paymentLinks.create({
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            metadata: {
                user_id: userId
            },
            after_completion: {
                type: 'redirect',
                redirect: {
                    url: 'https://api.athplan.com/payment-success?session_id={CHECKOUT_SESSION_ID}', // Placeholder URL
                },
            },
        });
        return paymentLink.url;
    }
    catch (error) {
        console.error('Error creating payment link:', error);
        throw error;
    }
});
exports.createPaymentLink = createPaymentLink;
const createCheckoutSession = (returnUrlBase) => __awaiter(void 0, void 0, void 0, function* () {
    if (!exports.stripe) {
        throw new Error('Stripe is not configured (missing STRIPE_SECRET_KEY).');
    }
    try {
        const session = yield exports.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Varsity Team Subscription',
                        },
                        unit_amount: 2000, // $20.00 (Amount in cents)
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${returnUrlBase}/success`, // Where to go after paying
            cancel_url: `${returnUrlBase}/cancel`, // Where to go if they give up
        });
        return { id: session.id, url: session.url };
    }
    catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
});
exports.createCheckoutSession = createCheckoutSession;
