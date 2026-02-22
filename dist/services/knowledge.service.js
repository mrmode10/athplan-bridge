"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const supabase_1 = require("./supabase");
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
class KnowledgeService {
    /**
     * Upload an Express.Multer file to Supabase Storage in the 'group_knowledge' bucket.
     * Path format: <groupName>/<originalFileName>
     */
    static uploadFileToSupabase(groupName, file) {
        return __awaiter(this, void 0, void 0, function* () {
            const bucketName = 'group_knowledge';
            // Check if bucket exists, if not create it (this requires elevated privileges, 
            // but the service role key might have them. If it fails, the user needs to create the bucket manually).
            try {
                yield supabase_1.supabase.storage.createBucket(bucketName, {
                    public: false,
                    allowedMimeTypes: ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'application/json', 'text/markdown'],
                    fileSizeLimit: 10485760 // 10MB
                });
            }
            catch (e) { /* ignore if already exists or no permission */ }
            // Upload to Supabase Storage
            const path = `${groupName}/${Date.now()}_${file.originalname}`;
            const { data, error } = yield supabase_1.supabase.storage
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
        });
    }
    /**
     * Optionally uploads to Voiceflow KB
     */
    static uploadToVoiceflowKB(groupName, file) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const VF_API_KEY = process.env.VOICEFLOW_API_KEY;
                if (!VF_API_KEY) {
                    throw new Error('VOICEFLOW_API_KEY missing');
                }
                const formData = new form_data_1.default();
                formData.append('file', file.buffer, {
                    filename: file.originalname,
                    contentType: file.mimetype,
                });
                // Based on docs, project ID or Workspace key is used at /v1/knowledge-base/docs/upload
                const url = `https://api.voiceflow.com/v1/knowledge-base/docs/upload`;
                const res = yield axios_1.default.post(url, formData, {
                    headers: Object.assign({ Authorization: VF_API_KEY }, formData.getHeaders()),
                });
                const documentId = ((_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.documentID) || ((_c = res.data) === null || _c === void 0 ? void 0 : _c.documentID);
                if (documentId) {
                    // Tagging API: PATCH /v1/knowledge-base/docs/:documentId
                    yield axios_1.default.patch(`https://api.voiceflow.com/v1/knowledge-base/docs/${documentId}`, {
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
            }
            catch (error) {
                console.error('Failed to upload to Voiceflow KB:', ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message);
                // We don't throw here to ensure Supabase uploading still succeeds even if VF fails.
                return { error: error.message };
            }
        });
    }
    /**
     * List files for a specific group from Supabase Storage
     */
    static listGroupFiles(groupName) {
        return __awaiter(this, void 0, void 0, function* () {
            const bucketName = 'group_knowledge';
            const { data, error } = yield supabase_1.supabase.storage
                .from(bucketName)
                .list(groupName);
            if (error) {
                throw new Error(`Failed to list files: ${error.message}`);
            }
            return data;
        });
    }
}
exports.KnowledgeService = KnowledgeService;
