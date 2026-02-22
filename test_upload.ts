import { KnowledgeService } from './src/services/knowledge.service';

async function testSupabaseUpload() {
    const file = {
        buffer: Buffer.from('Here is the schedule for group test.\nPractice at 6 PM.'),
        originalname: 'test_schedule.txt',
        mimetype: 'text/plain',
    };

    try {
        const groupName = 'test_group';
        console.log('Uploading to Supabase...');
        // We are simulating an Express.Multer.File object
        const path = await KnowledgeService.uploadFileToSupabase(groupName, file as Express.Multer.File);
        console.log('✅ Uploaded to Supabase! Path:', path);

        console.log('Uploading to Voiceflow KB...');
        const vfResult = await KnowledgeService.uploadToVoiceflowKB(groupName, file as Express.Multer.File);
        console.log('✅ Voiceflow Upload finished! Result:', vfResult);

    } catch (err: any) {
        console.error('❌ Test failed:', err.message);
    }
}

testSupabaseUpload();
