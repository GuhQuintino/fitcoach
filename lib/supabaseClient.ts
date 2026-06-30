import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

if (typeof window !== 'undefined') {
    (window as any).supabase = supabase;
}

