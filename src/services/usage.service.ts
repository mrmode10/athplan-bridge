import { supabase } from './supabase';

const LIMIT = 400;

export class UsageService {
    static async checkUsage(phoneNumber: string): Promise<boolean> {
        const { data, error } = await supabase
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
    }

    static async incrementUsage(phoneNumber: string): Promise<void> {
        // Upsert logic: if exists increment, if not create with 1.
        // Supabase upsert needs all non-null columns if we want to insert.
        // We can do this in two steps or a clever upsert.

        // First, try to get existing
        const { data } = await supabase
            .from('usage')
            .select('message_count')
            .eq('phone_number', phoneNumber)
            .single();

        const currentCount = data ? data.message_count : 0;
        const newCount = currentCount + 1;

        const { error } = await supabase
            .from('usage')
            .upsert({
                phone_number: phoneNumber,
                message_count: newCount,
                updated_at: new Date()
            }, { onConflict: 'phone_number' });

        if (error) {
            console.error('Error incrementing usage:', error);
        }
    }
}
