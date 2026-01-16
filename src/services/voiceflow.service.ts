import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

    async interact(userId: string, request: any): Promise < VoiceflowResponse[] > {
    const versionID = process.env.VF_VERSION_ID || 'production';
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
                    versionID: versionID,
                },
            }
        );

        return response.data;
    } catch(error) {
        console.error('Error interacting with Voiceflow:', error);
        throw error;
    }
}
}
