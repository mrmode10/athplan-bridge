import { supabase } from './supabase';
import axios from 'axios';
import FormData from 'form-data';

export class KnowledgeService {
    /**
     * Upload an Express.Multer file to Supabase Storage in the 'group_knowledge' bucket.
     * Path format: <groupName>/<originalFileName>
     */
    static async uploadFileToSupabase(groupName: string, file: Express.Multer.File): Promise<string> {
        const bucketName = 'group_knowledge';

        // Check if bucket exists, if not create it (this requires elevated privileges, 
        // but the service role key might have them. If it fails, the user needs to create the bucket manually).
        try {
            await supabase.storage.createBucket(bucketName, {
                public: false,
                allowedMimeTypes: ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'application/json', 'text/markdown'],
                fileSizeLimit: 10485760 // 10MB
            });
        } catch (e) { /* ignore if already exists or no permission */ }

        // Upload to Supabase Storage
        const path = `${groupName}/${Date.now()}_${file.originalname}`;

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(path, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            throw new Error(`Failed to upload to Supabase: ${error.message}`);
        }

        // Return the bucket path
        return data.path;
    }

    /**
     * Optionally uploads to Voiceflow KB
     */
    static async uploadToVoiceflowKB(groupName: string, file: Express.Multer.File): Promise<any> {
        try {
            const VF_API_KEY = process.env.VOICEFLOW_API_KEY;
            if (!VF_API_KEY) {
                throw new Error('VOICEFLOW_API_KEY missing');
            }

            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
            });

            // Based on docs, project ID or Workspace key is used at /v1/knowledge-base/docs/upload
            const url = `https://api.voiceflow.com/v1/knowledge-base/docs/upload`;

            const res = await axios.post(url, formData, {
                headers: {
                    Authorization: VF_API_KEY,
                    ...formData.getHeaders(),
                },
            });

            const documentId = res.data?.data?.documentID || res.data?.documentID;
            if (documentId) {
                // Tagging API: PATCH /v1/knowledge-base/docs/:documentId
                await axios.patch(`https://api.voiceflow.com/v1/knowledge-base/docs/${documentId}`, {
                    data: {
                        tags: [groupName]
                    }
                }, {
                    headers: {
                        Authorization: VF_API_KEY,
                        'Content-Type': 'application/json'
                    }
                });
            }

            return res.data;
        } catch (error: any) {
            console.error('Failed to upload to Voiceflow KB:', error.response?.data || error.message);
            // We don't throw here to ensure Supabase uploading still succeeds even if VF fails.
            return { error: error.message };
        }
    }

    /**
     * List files for a specific group from Supabase Storage
     */
    static async listGroupFiles(groupName: string) {
        const bucketName = 'group_knowledge';
        const { data, error } = await supabase.storage
            .from(bucketName)
            .list(groupName);

        if (error) {
            throw new Error(`Failed to list files: ${error.message}`);
        }

        return data;
    }
}
