import { supabase } from './supabase';

export interface TelemetryLog {
    session_id: string;
    event_type: 'user_message' | 'bot_response' | 'error' | 'meta';
    payload: any;
    metadata?: any;
}

export class TelemetryService {
    static async log(data: TelemetryLog) {
        try {
            const { error } = await supabase
                .from('telemetry_logs')
                .insert([
                    {
                        session_id: data.session_id,
                        event_type: data.event_type,
                        payload: data.payload,
                        metadata: data.metadata,
                    },
                ]);

            if (error) {
                console.error('Error logging telemetry:', error);
            }
        } catch (err) {
            console.error('Unexpected error logging telemetry:', err);
        }
    }
}
