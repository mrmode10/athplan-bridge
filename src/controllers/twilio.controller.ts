import { Request, Response } from 'express';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import { interact, VoiceflowResponse } from '../services/voiceflow.service';
import { TelemetryService } from '../services/telemetry.service';
import { UsageService } from '../services/usage.service';
import { AdminService } from '../services/admin.service';

// Service instantiated no longer needed as we use functional export


export class TwilioController {
    static async handleWebhook(req: Request, res: Response) {
        const { Body, From } = req.body;
        const userId = From; // Use phone number as user ID

        console.log(`Received message from ${userId}: ${Body} `);

        // 1. Log Incoming Message
        await TelemetryService.log({
            session_id: userId,
            event_type: 'user_message',
            payload: { text: Body },
            metadata: { source: 'twilio' },
        });

        // 2. Admin Broadcast Check
        // Check if starts with broadcast command (e.g., "#update")
        if (Body?.trim().startsWith('#update')) {
            const adminInfo = await AdminService.validateAdmin(userId);

            if (adminInfo.isAdmin && adminInfo.groupName) {
                const messageContent = Body.replace('#update', '').trim();

                if (messageContent) {
                    const count = await AdminService.broadcastMessage(adminInfo.groupName, messageContent, userId);

                    // Reply to Admin
                    const twiml = new MessagingResponse();
                    twiml.message(`✅ Broadcast sent to ${count} members.`);
                    res.type('text/xml');
                    res.send(twiml.toString());
                    return; // Stop processing
                } else {
                    // Empty message
                    const twiml = new MessagingResponse();
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
        if (Body?.trim().startsWith('#schedule')) {
            const adminInfo = await AdminService.validateAdmin(userId);

            if (adminInfo.isAdmin && adminInfo.groupName) {
                const scheduleContent = Body.replace('#schedule', '').trim();

                if (scheduleContent) {
                    const result = await AdminService.saveScheduleUpdate(
                        adminInfo.groupName,
                        scheduleContent,
                        userId
                    );

                    // Reply to Admin
                    const twiml = new MessagingResponse();
                    if (result.saved) {
                        twiml.message(`✅ Schedule update saved and sent to ${result.broadcastCount} members.`);
                    } else {
                        // Show specific error if available, or generic
                        const errorMessage = result.error || 'Failed to save schedule update. Please try again.';
                        twiml.message(`❌ ${errorMessage}`);
                    }
                    res.type('text/xml');
                    res.send(twiml.toString());
                    return;
                } else {
                    // Empty message
                    const twiml = new MessagingResponse();
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
            const vfResponses = await interact(userId, vfAction);

            // 3. Log Voiceflow Response
            await TelemetryService.log({
                session_id: userId,
                event_type: 'bot_response',
                payload: vfResponses,
            });

            // 4. Format TwiML Response
            const twiml = new MessagingResponse();

            vfResponses.forEach((response: VoiceflowResponse) => {
                if (response.type === 'text') {
                    // Flatten newlines to individual messages or just send as one block?
                    // Usually splitting by message bubbles is better, but TwiML <Message> sends one SMS/WhatsApp per tag.
                    // WhatsApp treats multiple <Message> tags as multiple messages.
                    const text = response.payload.message;
                    twiml.message(text);
                } else if (response.type === 'image' && response.payload.url) {
                    const message = twiml.message('');
                    message.media(response.payload.url);
                }
                // Handle other types like 'choice', 'card' if needed (mapped to text for WhatsApp)
            });

            res.type('text/xml');
            res.send(twiml.toString());
        } catch (error: any) {
            console.error('Error in Twilio webhook:', error);

            // Log Error
            await TelemetryService.log({
                session_id: userId,
                event_type: 'error',
                payload: { error: error.message },
            });

            const twiml = new MessagingResponse();
            twiml.message('Sorry, something went wrong. Please try again later.');
            res.type('text/xml');
            res.send(twiml.toString());
        }
    }
}
