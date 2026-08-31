import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 'https://mock.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 'mock-key';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://mock.supabase.co') {
    if (typeof window !== 'undefined') {
        const msg = 'Missing Supabase environment variables. Check .env.local';
        console.warn(msg);
    }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

if (typeof window !== 'undefined') {
    (window as any).supabase = supabase;
}

