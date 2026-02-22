import axios from 'axios';
import FormData from 'form-data';
import 'dotenv/config';

const VF_API_KEY = process.env.VOICEFLOW_API_KEY;
// The user provided this project ID
const VF_PROJECT_ID = '69984ef59a4dd4facbfe8a33';

async function testUpload() {
    try {
        const formData = new FormData();
        formData.append('file', Buffer.from('Here is my test knowledge base data for group X.\nPractice is at 5PM.'), {
            filename: 'group_x_schedule.txt',
            contentType: 'text/plain',
        });

        const url = `https://api.voiceflow.com/v1/projects/${VF_PROJECT_ID}/knowledge-base/docs/upload`;
        console.log('Hitting URL:', url);

        const res = await axios.post(url, formData, {
            headers: {
                Authorization: VF_API_KEY,
                ...formData.getHeaders(),
            },
        });

        console.log('Upload success:', res.data);
    } catch (err) {
        console.error('Upload error:', (err as any).response?.data || (err as any).message);
    }
}

testUpload();
