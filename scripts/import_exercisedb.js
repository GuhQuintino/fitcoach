import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars (simple loader since we are in a module and dotenv might not be installed, 
// but we can try to read .env.local directly)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY; // Use Service Role if possible for cleanups, but Anon is ok if RLS allows or we use admin client
const rapidApiKey = env.EXERCISEDB_API_KEY;

if (!rapidApiKey) {
    console.error('❌ ERRO: EXERCISEDB_API_KEY não encontrada em .env.local');
    console.log('👉 Adicione sua chave no arquivo .env.local assim: EXERCISEDB_API_KEY=sua_chave_aqui');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importExercises() {
    console.log('🚀 Iniciando importação do ExerciseDB...');

    try {
        const url = 'https://exercisedb.p.rapidapi.com/exercises?limit=50';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': rapidApiKey,
                'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
            },
            signal: controller.signal
        };

        console.log('📥 Baixando exercícios (Limit: 1300, Timeout: 60s)...');
        const response = await fetch(url, options).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
        }

        const exercises = await response.json();
        console.log(`✅ Recebidos ${exercises.length} exercícios.`);

        const outputPath = path.resolve(__dirname, 'raw_exercises.json');
        fs.writeFileSync(outputPath, JSON.stringify(exercises, null, 2));
        console.log(`💾 Salvo em: ${outputPath}`);

    } catch (error) {
        console.error(error);
    }
}

// Placeholder, logic moved to next step
function translateName(name) {
    return name;
}

importExercises();
