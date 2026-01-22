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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageService = void 0;
const supabase_1 = require("./supabase");
const LIMIT = 400;
class UsageService {
    static checkUsage(phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield supabase_1.supabase
                .from('usage')
                .select('message_count')
                .eq('phone_number', phoneNumber)
                .single();
            if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
                console.error('Error checking usage:', error);
                return true; // Fail open or closed? Lets fail open for now to avoid blocking on DB error, or closed for strictness.
                // User asked: "Check... If allowed..." implied fail closed if we can't check? 
                // Actually strictly: "If count >= 400 ... STOP". missing row = 0 count.
            }
            if (!data) {
                return true; // No record means 0 usage.
            }
            return data.message_count < LIMIT;
        });
    }
    static incrementUsage(phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            // Upsert logic: if exists increment, if not create with 1.
            // Supabase upsert needs all non-null columns if we want to insert.
            // We can do this in two steps or a clever upsert.
            // First, try to get existing
            const { data } = yield supabase_1.supabase
                .from('usage')
                .select('message_count')
                .eq('phone_number', phoneNumber)
                .single();
            const currentCount = data ? data.message_count : 0;
            const newCount = currentCount + 1;
            const { error } = yield supabase_1.supabase
                .from('usage')
                .upsert({
                phone_number: phoneNumber,
                message_count: newCount,
                updated_at: new Date()
            }, { onConflict: 'phone_number' });
            if (error) {
                console.error('Error incrementing usage:', error);
            }
        });
    }
}
exports.UsageService = UsageService;
