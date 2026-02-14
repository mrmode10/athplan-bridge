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
exports.validateSubscription = void 0;
const supabase_1 = require("../services/supabase");
const MessagingResponse_1 = __importDefault(require("twilio/lib/twiml/MessagingResponse"));
const validateSubscription = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { From, Body } = req.body;
    // 1. Allow 'Join' commands to pass through (so new users can join)
    if (Body === null || Body === void 0 ? void 0 : Body.trim().toLowerCase().startsWith('join ')) {
        return next();
    }
    // 2. Allow Admin setup commands? #update, #schedule?
    // No, requirement says "suspend access... if payment malfunctioned".
    // Admins should fix payment first.
    try {
        // 3. Get User's Group from bot_users
        // Note: This relies on phone number linkage.
        const { data: userData, error: userError } = yield supabase_1.supabase
            .from('bot_users')
            .select('group_name')
            .eq('phone_number', From)
            .single();
        if (userError || !userData || !userData.group_name) {
            // User not found in any group.
            // Allow them to proceed (e.g. to Voiceflow which handles "You are not registered")
            return next();
        }
        const groupName = userData.group_name;
        // 4. Check Team Subscription Status
        const { data: teamData, error: teamError } = yield supabase_1.supabase
            .from('teams')
            .select('subscription_status')
            .eq('name', groupName)
            .single();
        if (teamError || !teamData) {
            // Team not found data inconsistency.
            // Fail open to prevent blocking valid users if DB is sync-lagged
            console.warn(`[Subscription] Team not found for group: ${groupName}`);
            return next();
        }
        const status = teamData.subscription_status;
        const validStatuses = ['active', 'trialing'];
        // If status is null, treat as inactive? Or trialing?
        // Default is 'trialing' on creation.
        if (status && !validStatuses.includes(status)) {
            console.log(`[Subscription] Blocked user ${From} (Team: ${groupName}, Status: ${status})`);
            const twiml = new MessagingResponse_1.default();
            twiml.message(`⛔ Service Suspended\n\nYour team's subscription is currently ${status}. Access is paused until payment is updated.`);
            res.type('text/xml');
            res.send(twiml.toString());
            return;
        }
        // 5. Valid Subscription
        next();
    }
    catch (err) {
        console.error('[Subscription Middleware] Error:', err);
        next(); // Fail open
    }
});
exports.validateSubscription = validateSubscription;
