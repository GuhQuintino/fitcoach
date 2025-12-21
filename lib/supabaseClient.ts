import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Initializing Supabase:', {
    url: supabaseUrl ? 'Defined' : 'Missing',
    key: supabaseAnonKey ? 'Defined' : 'Missing'
});

if (!supabaseUrl || !supabaseAnonKey) {
    const msg = 'Missing Supabase environment variables. Check .env.local';
    alert(msg);
    throw new Error(msg)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
