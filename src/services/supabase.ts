import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: Supabase variables are undefined in process.env");
    console.error("SUPABASE_URL:", supabaseUrl ? "set" : "MISSING");
    console.error("SUPABASE_KEY:", supabaseKey ? "set" : "MISSING");
    throw new Error('Missing Supabase URL or Key');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
