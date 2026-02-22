import { supabase } from './src/services/supabase';

async function checkSchema() {
    const { data, error } = await supabase.from('teams').select('*').limit(1);
    console.log(error ? error : data);
}

checkSchema();
