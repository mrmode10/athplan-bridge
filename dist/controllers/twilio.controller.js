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
            // 2. Admin Broadcast Check
            // Check if starts with broadcast command (e.g., "#update")
            if (Body === null || Body === void 0 ? void 0 : Body.trim().startsWith('#update')) {
                const adminInfo = yield admin_service_1.AdminService.validateAdmin(userId);
                if (adminInfo.isAdmin && adminInfo.groupName) {
                    const messageContent = Body.replace('#update', '').trim();
                    if (messageContent) {
                        const count = yield admin_service_1.AdminService.broadcastMessage(adminInfo.groupName, messageContent, userId);
                        // Reply to Admin
                        const twiml = new MessagingResponse_1.default();
                        twiml.message(`✅ Broadcast sent to ${count} members.`);
                        res.type('text/xml');
                        res.send(twiml.toString());
                        return; // Stop processing
                    }
                    else {
                        // Empty message
                        const twiml = new MessagingResponse_1.default();
                        twiml.message(`⚠️ Message content missing. Usage: #update <message>`);
                        res.type('text/xml');
                        res.send(twiml.toString());
                        return;
                    }
                }
                // If not admin, fall through to normal bot processing (Voiceflow)
                // This prevents leaking existence of admin command to non-admins
            }
            // 3. Admin Schedule Update Check
            // Check if starts with schedule command (e.g., "#schedule")
            if (Body === null || Body === void 0 ? void 0 : Body.trim().startsWith('#schedule')) {
                const adminInfo = yield admin_service_1.AdminService.validateAdmin(userId);
                if (adminInfo.isAdmin && adminInfo.groupName) {
                    const scheduleContent = Body.replace('#schedule', '').trim();
                    if (scheduleContent) {
                        const result = yield admin_service_1.AdminService.saveScheduleUpdate(adminInfo.groupName, scheduleContent, userId);
                        // Reply to Admin
                        const twiml = new MessagingResponse_1.default();
                        if (result.saved) {
                            twiml.message(`✅ Schedule update saved and sent to ${result.broadcastCount} members.`);
                        }
                        else {
                            twiml.message(`❌ Failed to save schedule update. Please try again.`);
                        }
                        res.type('text/xml');
                        res.send(twiml.toString());
                        return;
                    }
                    else {
                        // Empty message
                        const twiml = new MessagingResponse_1.default();
                        twiml.message(`⚠️ Schedule content missing.\n\nUsage: #schedule <your update>\n\nExample: #schedule Bus leaves at 8am tomorrow`);
                        res.type('text/xml');
                        res.send(twiml.toString());
                        return;
                    }
                }
                // If not admin, fall through to normal bot processing
            }
            try {
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
                        // Flatten newlines to individual messages or just send as one block?
                        // Usually splitting by message bubbles is better, but TwiML <Message> sends one SMS/WhatsApp per tag.
                        // WhatsApp treats multiple <Message> tags as multiple messages.
                        const text = response.payload.message;
                        twiml.message(text);
                    }
                    else if (response.type === 'image' && response.payload.url) {
                        const message = twiml.message('');
                        message.media(response.payload.url);
                    }
                    // Handle other types like 'choice', 'card' if needed (mapped to text for WhatsApp)
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
