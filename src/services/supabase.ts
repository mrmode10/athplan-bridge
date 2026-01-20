import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
if (!url || !key) {
    console.error("CRITICAL: Supabase URL (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL) or KEY is missing.");
}
export const supabase = createClient(url || '', key || '');
