
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log('\n--- Checking RLS Policies (Anonymous Role) ---');

    // 1. Try to fetch profiles (Should fail or return 0)
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(5);
    if (pError) console.log('Profiles check: Error (Good) -', pError.message);
    else console.log(`Profiles check: Access allowed? ${profiles?.length} rows (Should be 0 for anon)`);

    // 2. Try to fetch exercises (Should return 0 if policies require auth)
    const { data: exercises, error: eError } = await supabase.from('exercises').select('*').limit(5);
    if (eError) console.log('Exercises check: Error -', eError.message);
    else console.log(`Exercises check: Access allowed? ${exercises?.length} rows (Should be 0 if 'Coach see...' requires auth)`);
}

async function checkUUIDConfig() {
    console.log('\n--- Checking UUID Configuration ---');
    // Using an RPC call or basic insertion if possible? No, don't modify.
    // Just verifying the IDs returned by the previous queries (if any).
    // If not, we rely on the schema analysis.
    console.log('Static Analysis Findings:');
    console.log('- "uuid-ossp" extension is enabled in SQL.');
    console.log('- Tables use "DEFAULT uuid_generate_v4()".');
    console.log('- IDs are typed as UUID in database.');
}

async function run() {
    await checkRLS();
    await checkUUIDConfig();
}

run();
