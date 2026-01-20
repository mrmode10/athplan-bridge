import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: Production keys are undefined in process.env");
}
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
