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
exports.interact = void 0;
const axios_1 = __importDefault(require("axios"));
// HARDCODED for Hostinger compatibility
const VOICEFLOW_API_KEY = 'VF.DM.695e50cb133e3e0a3b7df140.fGoqnuGni7lSOHIP';
const VF_VERSION_ID = 'production';
const interact = (userId, request) => __awaiter(void 0, void 0, void 0, function* () {
    const runtimeUrl = 'https://general-runtime.voiceflow.com';
    try {
        console.log(`Voiceflow interact: userId=${userId}, request=`, request);
        const response = yield axios_1.default.post(`${runtimeUrl}/state/user/${userId}/interact`, {
            request,
            config: {
                tts: false,
                stripSSML: true,
            },
        }, {
            headers: {
                Authorization: VOICEFLOW_API_KEY,
                versionID: VF_VERSION_ID,
            },
        });
        console.log('Voiceflow response:', response.data);
        return response.data;
    }
    catch (error) {
        console.error('Error interacting with Voiceflow:', error.message);
        if (error.response) {
            console.error('Voiceflow error response:', error.response.data);
        }
        throw error;
    }
});
exports.interact = interact;
