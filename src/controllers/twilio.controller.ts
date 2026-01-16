import { Request, Response } from 'express';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import { VoiceflowService, VoiceflowResponse } from '../services/voiceflow.service';
import { TelemetryService } from '../services/telemetry.service';

const voiceflowService = new VoiceflowService();

export class TwilioController {
    static async handleWebhook(req: Request, res: Response) {
        const { Body, From } = req.body;
        const userId = From; // Use phone number as user ID

        console.log(`Received message from ${userId}: ${Body}`);

        // 1. Log Incoming Message
        await TelemetryService.log({
            session_id: userId,
            event_type: 'user_message',
            payload: { text: Body },
            metadata: { source: 'twilio' },
        });

        try {
            // 2. Interact with Voiceflow
            const vfAction = { type: 'text', payload: Body };
            const vfResponses = await voiceflowService.interact(userId, vfAction);

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
                } else if (response.type === 'image') {
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
