import axios from 'axios';

const PORT = 3000;
const URL = `http://localhost:${PORT}/portal-session`;

async function testPortalSession() {
    try {
        console.log('Testing /portal-session endpoint...');
        const response = await axios.post(URL, {
            email: 'test_user@example.com', // Use a test email
            returnUrl: 'http://localhost:3000/dashboard' // Mock return URL
        });

        console.log('✅ Response Status:', response.status);
        console.log('✅ Portal URL:', response.data.url);
    } catch (error: any) {
        if (error.response) {
            console.error('❌ Error Status:', error.response.status);
            console.error('❌ Error Data:', error.response.data);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

testPortalSession();
