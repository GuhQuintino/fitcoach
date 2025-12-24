
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
        if (line.startsWith('#')) return;
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
            env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
    return env;
}

const env = loadEnv();
const url = env['VITE_SUPABASE_URL'];
const key = env['VITE_SUPABASE_ANON_KEY'];

if (!url || !key) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
    const { data, error } = await supabase.from('exercises').select('id').limit(5);
    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Success! Found:", data);
    }
}

test();
