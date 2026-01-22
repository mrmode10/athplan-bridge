import axios from 'axios';

// HARDCODED for Hostinger compatibility
const VOICEFLOW_API_KEY = 'VF.DM.695e50cb133e3e0a3b7df140.fGoqnuGni7lSOHIP';
const VF_VERSION_ID = 'production';

export interface VoiceflowResponse {
    type: string;
    payload: {
        message: string;
        url?: string;
    };
}

export const interact = async (userId: string, request: any): Promise<VoiceflowResponse[]> => {
    const runtimeUrl = 'https://general-runtime.voiceflow.com';

    try {
        console.log(`Voiceflow interact: userId=${userId}, request=`, request);

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
                    Authorization: VOICEFLOW_API_KEY,
                    versionID: VF_VERSION_ID,
                },
            }
        );

        console.log('Voiceflow response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Error interacting with Voiceflow:', error.message);
        if (error.response) {
            console.error('Voiceflow error response:', error.response.data);
        }
        throw error;
    }
};
