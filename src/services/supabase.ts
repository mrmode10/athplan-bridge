import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
if (!url || !key) {
    console.error("CRITICAL: ENV VARS MISSING IN PRODUCTION");
    // Prevents hard crash during build process
}
export const supabase = createClient(url || '', key || '');
