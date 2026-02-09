
import { config } from 'dotenv';
import axios from 'axios';

// Load .env for local testing (if needed) but we are hitting a URL
config({ path: '../.env' }); // Adjust path if needed

const AI_ROUTER_URL = 'http://127.0.0.1:54321/functions/v1/ai-router'; // Local Supabase
// const AI_ROUTER_URL = 'https://ppjzhesecvagtwfbvoek.supabase.co/functions/v1/ai-router'; // Production

async function testAI() {
    console.log('🧪 Testing AI Router...');
    console.log(`Target URL: ${AI_ROUTER_URL}`);

    const payload = {
        user_id: 'test-user-123', // Mock ID
        prompt: 'Hello! Are you a real AI or a mock function? Answer in one short sentence.'
    };

    try {
        const response = await axios.post(AI_ROUTER_URL, payload, {
            headers: {
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'INSERT_ANON_KEY_IF_LOCAL_ENV_MISSING'}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n✅ Response Received:');
        console.log('---------------------------------------------------');
        console.log(`Model Used: ${response.data.model_used}`);
        console.log(`Result: ${response.data.result}`);
        console.log('---------------------------------------------------');

    } catch (error: any) {
        console.error('\n❌ Error calling AI Router:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
        console.log('\nTip: Ensure "supabase start" is running if testing locally.');
    }
}

testAI();
