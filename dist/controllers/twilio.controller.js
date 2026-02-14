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
exports.TwilioController = void 0;
const MessagingResponse_1 = __importDefault(require("twilio/lib/twiml/MessagingResponse"));
const voiceflow_service_1 = require("../services/voiceflow.service");
const telemetry_service_1 = require("../services/telemetry.service");
const admin_service_1 = require("../services/admin.service");
const supabase_1 = require("../services/supabase");
// Service instantiated no longer needed as we use functional export
class TwilioController {
    static handleWebhook(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { Body, From } = req.body;
            const userId = From; // Use phone number as user ID
            console.log(`Received message from ${userId}: ${Body} `);
            // 1. Log Incoming Message
            yield telemetry_service_1.TelemetryService.log({
                session_id: userId,
                event_type: 'user_message',
                payload: { text: Body },
                metadata: { source: 'twilio' },
            });
            // 1.5 Join Team Check
            if (Body === null || Body === void 0 ? void 0 : Body.trim().toLowerCase().startsWith('join ')) {
                const joinCode = Body.trim().substring(5).trim();
                if (joinCode) {
                    const result = yield admin_service_1.AdminService.handleJoinRequest(userId, joinCode);
                    const twiml = new MessagingResponse_1.default();
                    if (result.success) {
                        twiml.message(`✅ You have successfully joined *${result.teamName}*!`);
                    }
                    else {
                        twiml.message(`❌ ${result.error || 'Failed to join group.'}`);
                    }
                    res.type('text/xml');
                    res.send(twiml.toString());
                    return;
                }
                else {
                    const twiml = new MessagingResponse_1.default();
                    twiml.message(`⚠️ Usage: Join <Code>\nExample: Join Lions-1234`);
                    res.type('text/xml');
                    res.send(twiml.toString());
                    return;
                }
            }
            // 2. Admin Broadcast Check
            if (Body === null || Body === void 0 ? void 0 : Body.trim().startsWith('#update')) {
                const adminInfo = yield admin_service_1.AdminService.validateAdmin(userId);
                if (adminInfo.isAdmin && adminInfo.groupName) {
                    const messageContent = Body.replace('#update', '').trim();
                    if (messageContent) {
                        const count = yield admin_service_1.AdminService.broadcastMessage(adminInfo.groupName, messageContent, userId);
                        const twiml = new MessagingResponse_1.default();
                        twiml.message(`✅ Broadcast sent to ${count} members.`);
                        res.type('text/xml');
                        res.send(twiml.toString());
                        return;
                    }
                    else {
                        const twiml = new MessagingResponse_1.default();
                        twiml.message(`⚠️ Message content missing. Usage: #update <message>`);
                        res.type('text/xml');
                        res.send(twiml.toString());
                        return;
                    }
                }
            }
            // 3. Admin Schedule Update Check
            if (Body === null || Body === void 0 ? void 0 : Body.trim().startsWith('#schedule')) {
                const adminInfo = yield admin_service_1.AdminService.validateAdmin(userId);
                if (adminInfo.isAdmin && adminInfo.groupName) {
                    const scheduleContent = Body.replace('#schedule', '').trim();
                    if (scheduleContent) {
                        const result = yield admin_service_1.AdminService.saveScheduleUpdate(adminInfo.groupName, scheduleContent, userId);
                        const twiml = new MessagingResponse_1.default();
                        if (result.saved) {
                            twiml.message(`✅ Schedule update saved and sent to ${result.broadcastCount} members.`);
                        }
                        else {
                            const errorMessage = result.error || 'Failed to save schedule update. Please try again.';
                            twiml.message(`❌ ${errorMessage}`);
                        }
                        res.type('text/xml');
                        res.send(twiml.toString());
                        return;
                    }
                    else {
                        const twiml = new MessagingResponse_1.default();
                        twiml.message(`⚠️ Schedule content missing.\n\nUsage: #schedule <your update>\n\nExample: #schedule Bus leaves at 8am tomorrow`);
                        res.type('text/xml');
                        res.send(twiml.toString());
                        return;
                    }
                }
            }
            try {
                // 2.5 Context Injection
                // Fetch user data and update Voiceflow variables
                // We use bot_users to get the group/team.
                const { data: userData } = yield supabase_1.supabase
                    .from('bot_users')
                    .select('group_name, is_admin')
                    .eq('phone_number', userId)
                    .single();
                let planStatus = 'free';
                let planName = 'starter';
                let teamName = (userData === null || userData === void 0 ? void 0 : userData.group_name) || '';
                if (userData && userData.group_name) {
                    // Fetch team details for plan status
                    const { data: teamData } = yield supabase_1.supabase
                        .from('teams')
                        .select('subscription_status, plan')
                        .eq('name', userData.group_name)
                        .single();
                    if (teamData) {
                        planStatus = teamData.subscription_status || 'free';
                        planName = teamData.plan || 'starter';
                    }
                }
                // Inject variables into Voiceflow
                const now = new Date();
                const timeOptions = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                    timeZone: 'Europe/Berlin' // Defaulting to EU/Berlin as per Athplan general region, or could use UTC
                };
                const humanTime = now.toLocaleDateString('en-US', timeOptions);
                yield (0, voiceflow_service_1.updateVariables)(userId, {
                    team_name: teamName,
                    is_admin: !!(userData === null || userData === void 0 ? void 0 : userData.is_admin),
                    plan_status: planStatus,
                    plan_name: planName,
                    user_id: userId,
                    current_time: humanTime // e.g. "Friday, February 13, 2026, 1:30 PM"
                });
                // 3. Interact with Voiceflow
                const vfAction = { type: 'text', payload: Body };
                const vfResponses = yield (0, voiceflow_service_1.interact)(userId, vfAction);
                // 3. Log Voiceflow Response
                yield telemetry_service_1.TelemetryService.log({
                    session_id: userId,
                    event_type: 'bot_response',
                    payload: vfResponses,
                });
                // 4. Format TwiML Response
                const twiml = new MessagingResponse_1.default();
                vfResponses.forEach((response) => {
                    if (response.type === 'text') {
                        const text = response.payload.message;
                        twiml.message(text);
                    }
                    else if (response.type === 'image' && response.payload.url) {
                        const message = twiml.message('');
                        message.media(response.payload.url);
                    }
                });
                res.type('text/xml');
                res.send(twiml.toString());
            }
            catch (error) {
                console.error('Error in Twilio webhook:', error);
                // Log Error
                yield telemetry_service_1.TelemetryService.log({
                    session_id: userId,
                    event_type: 'error',
                    payload: { error: error.message },
                });
                const twiml = new MessagingResponse_1.default();
                twiml.message('Sorry, something went wrong. Please try again later.');
                res.type('text/xml');
                res.send(twiml.toString());
            }
        });
    }
}
exports.TwilioController = TwilioController;
