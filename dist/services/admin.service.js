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
exports.AdminService = void 0;
const supabase_1 = require("./supabase");
const twilio_1 = __importDefault(require("twilio"));
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
class AdminService {
    /**
     * Checks if a phone number belongs to an admin.
     * @param phoneNumber The phone number to check.
     * @returns Object containing isAdmin status and groupName if admin.
     */
    static validateAdmin(phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if user exists and is admin
                // Using supabase client (service role) to bypass RLS if 'bot_users' is locked down
                const { data, error } = yield supabase_1.supabase
                    .from('bot_users')
                    .select('is_admin, group_name')
                    .eq('phone_number', phoneNumber)
                    .single();
                if (error || !data) {
                    // Not found or error
                    return { isAdmin: false };
                }
                return {
                    isAdmin: !!data.is_admin,
                    groupName: data.group_name
                };
            }
            catch (error) {
                console.error('Error validating admin:', error);
                return { isAdmin: false };
            }
        });
    }
    /**
     * Broadcasts a message to all members of a group EXCEPT the sender.
     * @param groupName The name of the group to broadcast to.
     * @param message The message content.
     * @param senderPhone The phone number of the sender (to exclude).
     * @returns The number of messages sent.
     */
    static broadcastMessage(groupName, message, senderPhone) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
                console.error('Twilio credentials missing for broadcast.');
                return 0;
            }
            try {
                // 1. Get all recipients in the group
                const { data: recipients, error } = yield supabase_1.supabase
                    .from('bot_users')
                    .select('phone_number')
                    .eq('group_name', groupName)
                    .neq('phone_number', senderPhone); // Exclude sender
                if (error || !recipients || recipients.length === 0) {
                    console.log(`No recipients found for broadcast in group: ${groupName}`);
                    return 0;
                }
                // 2. Send messages
                const client = (0, twilio_1.default)(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
                let sentCount = 0;
                // We iterate sequentially to avoid rate limits or overwhelming Twilio if list is huge.
                // For MVP/small groups, Promise.all is faster but let's be safe.
                const results = yield Promise.allSettled(recipients.map((user) => __awaiter(this, void 0, void 0, function* () {
                    // Use the configured "From" number. 
                    // Assuming 'whatsapp:+1...' format for both from and to.
                    // We need to know the SOURCE number. 
                    // Usually it's in env TWILIO_PHONE_NUMBER or we hardcode the known business number.
                    // For now, we'll try to use the environment variable if exists, or a default.
                    // HOWEVER, WhatsApp requires stemming from the specific sender ID.
                    // We will assume the sender of the webhook (the business number) is what we use.
                    // Since we don't have it passed here easily, we'll try to find it or use a default.
                    // Let's look for TWILIO_PHONE_NUMBER in env.
                    const fromNumber = process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+18139454758';
                    yield client.messages.create({
                        from: fromNumber,
                        to: user.phone_number,
                        body: `📢 *Admin Update:*\n${message}`
                    });
                    return true;
                })));
                sentCount = results.filter(r => r.status === 'fulfilled').length;
                console.log(`Broadcasted to ${sentCount} / ${recipients.length} members in ${groupName}.`);
                return sentCount;
            }
            catch (error) {
                console.error('Error during broadcast:', error);
                throw error;
            }
        });
    }
    /**
     * Saves a schedule update to the database and broadcasts it to the group.
     * @param groupName The name of the group.
     * @param updateContent The schedule update text.
     * @param senderPhone The admin's phone number.
     * @returns Object with saved status and broadcast count.
     */
    static saveScheduleUpdate(groupName, updateContent, senderPhone) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 0. Validate Admin Authority
                const adminInfo = yield this.validateAdmin(senderPhone);
                if (!adminInfo.isAdmin) {
                    console.warn(`[Security] Unauthorized schedule update attempt by ${senderPhone}`);
                    return { saved: false, broadcastCount: 0, error: 'Unauthorized: Sender is not an admin.' };
                }
                // Optional: Enforce that admin can only update THEIR group
                // If the request specifies a group different from the admin's group, reject it.
                // This prevents an admin of Group A from spamming Group B.
                if (adminInfo.groupName !== groupName) {
                    console.warn(`[Security] Admin ${senderPhone} (Group: ${adminInfo.groupName}) tried to update Group: ${groupName}`);
                    return { saved: false, broadcastCount: 0, error: 'Unauthorized: You can only update your own group.' };
                }
                // 1. Save to schedule_updates table
                const { error: insertError } = yield supabase_1.supabase
                    .from('schedule_updates')
                    .insert({
                    group_name: groupName,
                    content: updateContent,
                    created_by: senderPhone,
                    created_at: new Date().toISOString()
                });
                if (insertError) {
                    console.error('Error saving schedule update:', insertError);
                    return { saved: false, broadcastCount: 0, error: 'Database error.' };
                }
                // 2. Broadcast to group with "UPDATE" prefix
                const broadcastMessage = `📋 *SCHEDULE UPDATE*\n\n${updateContent}`;
                const broadcastCount = yield this.broadcastMessage(groupName, broadcastMessage, senderPhone);
                return { saved: true, broadcastCount };
            }
            catch (error) {
                console.error('Error in saveScheduleUpdate:', error);
                return { saved: false, broadcastCount: 0, error: error.message };
            }
        });
    }
    /**
     * Handles a user request to join a team via a unique code.
     * @param senderPhone The phone number of the user.
     * @param joinCode The unique code provided by the user.
     * @returns Object with success status and team name.
     */
    static handleJoinRequest(senderPhone, joinCode) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Find the team by join_code
                const { data: team, error: teamError } = yield supabase_1.supabase
                    .from('teams')
                    .select('id, name')
                    .eq('join_code', joinCode)
                    .single();
                if (teamError || !team) {
                    return { success: false, error: 'Invalid join code. Please check and try again.' };
                }
                // 2. Update/Insert into bot_users
                // This grants the user access to the group's schedule and AI context
                const { error: upsertError } = yield supabase_1.supabase
                    .from('bot_users')
                    .upsert({
                    phone_number: senderPhone,
                    group_name: team.name,
                    // updated_at: new Date().toISOString() // if exists
                });
                if (upsertError) {
                    console.error('Error updating bot_users:', upsertError);
                    return { success: false, error: 'Failed to join group. Please try again.' };
                }
                return { success: true, teamName: team.name };
            }
            catch (error) {
                console.error('Error handling join request:', error);
                return { success: false, error: 'System error processing join request.' };
            }
        });
    }
}
exports.AdminService = AdminService;
