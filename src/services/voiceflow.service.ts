import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface VoiceflowResponse {
    type: string;
    payload: {
        message: string;
        url?: string;
    };
}

export const interact = async (userId: string, request: any): Promise<VoiceflowResponse[]> => {
    const apiKey = process.env.VOICEFLOW_API_KEY;
    const versionID = process.env.VF_VERSION_ID || 'production';
    const runtimeUrl = 'https://general-runtime.voiceflow.com';

    try {
        const response = await axios.post(
            `${runtimeUrl}/state/user/${userId}/interact`,
            {
                request,
                config: {
                    tts: false,
                    stripSSML: true,
                },
            },
            {
                headers: {
                    Authorization: apiKey,
                    versionID: versionID,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error interacting with Voiceflow:', error);
        throw error;
    }
};
