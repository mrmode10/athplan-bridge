import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const FORCE_VERSION = 'production'; // or 'development' if needed

export interface VoiceflowResponse {
    type: string;
    payload: any;
}

export class VoiceflowService {
    private apiKey: string;
    private projectId: string;
    private runtimeUrl: string = 'https://general-runtime.voiceflow.com';

    constructor() {
        this.apiKey = process.env.VOICEFLOW_API_KEY || '';
        this.projectId = process.env.VF_PROJECT_ID || '';
        if (!this.apiKey) {
            console.warn('Voiceflow API key is missing');
        }
    }

    async interact(userId: string, request: any): Promise<VoiceflowResponse[]> {
        try {
            const response = await axios.post(
                `${this.runtimeUrl}/state/user/${userId}/interact`,
                {
                    request,
                    config: {
                        tts: false,
                        stripSSML: true,
                    },
                },
                {
                    headers: {
                        Authorization: this.apiKey,
                        versionID: FORCE_VERSION,
                    },
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error interacting with Voiceflow:', error);
            throw error;
        }
    }
}
