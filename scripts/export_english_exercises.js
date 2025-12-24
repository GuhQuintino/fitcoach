
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const envPath = path.resolve(__dirname, '../.env.local');
    console.log("Loading env from:", envPath);

    if (!fs.existsSync(envPath)) {
        console.log("File NOT found!");
        return {};
    }

    const content = fs.readFileSync(envPath, 'utf-8');
    const envVar = {}; // Rename to avoid conflict if any
    content.split('\n').forEach(line => {
        if (line.startsWith('#')) return;
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
            envVar[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
    return envVar;
}

const envVars = loadEnv();
const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['VITE_SUPABASE_ANON_KEY'];

console.log("URL Found:", !!supabaseUrl);
console.log("Key Found:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportExercises() {
    console.log("Fetching English exercises...");

    // Fetch specifically exercises that look English and are NOT 'Recuperado'
    // Using a simpler ILIKE approach to ensure we catch them
    // Note: Suapbase filters are appended.
    const { data: exercises, error } = await supabase
        .from('exercises')
        .select('id, name, description')
        .limit(5);

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    console.log(`Found ${exercises.length} exercises.`);
    const outputPath = path.resolve(__dirname, 'exercises_to_translate.json');
    fs.writeFileSync(outputPath, JSON.stringify(exercises, null, 2));
    console.log(`Exported to ${outputPath}`);
}

exportExercises();
