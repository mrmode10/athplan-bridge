import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
if (!url || !key) {
    console.error("CRITICAL: SUPABASE_URL or SUPABASE_KEY is missing in production.");
}
export const supabase = createClient(url || '', key || '');
