import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: ENV VARS MISSING IN PRODUCTION");
    // Prevents hard crash during build process
}
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
