import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env for Supabase
const envPath = path.resolve(__dirname, '../.env.local');
let env = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });
} else {
    // Fallback or error if env not checked
    console.warn("⚠️ .env.local not found, relying on process.env or failing.");
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY; // Prioritize Service Role

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase connection keys missing (Need VITE_SUPABASE_SERVICE_ROLE_KEY for admin insert).");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function processExercises() {
    try {
        const rawPath = path.resolve(__dirname, 'raw_exercises_yuhonas.json');
        if (!fs.existsSync(rawPath)) {
            console.error('Arquivo raw_exercises_yuhonas.json não encontrado (Execute curl download primeiro).');
            return;
        }

        const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
        console.log(`🔍 Processando ${rawData.length} exercícios do banco Yuhonas...`);

        const muscleMap = {
            'abdominals': 'abs',
            'hamstrings': 'legs',
            'biceps': 'arms',
            'shoulders': 'shoulders',
            'chest': 'chest',
            'lower back': 'back',
            'middle back': 'back',
            'lats': 'back',
            'triceps': 'arms',
            'quadriceps': 'legs',
            'glutes': 'legs',
            'calves': 'legs',
            'adductors': 'legs',
            'abductors': 'legs',
            'traps': 'back',
            'forearms': 'arms',
            'neck': 'shoulders'
        };

        const exercisesToInsert = [];

        for (const ex of rawData) {
            // Yuhonas data often contains 'name', 'primaryMuscles', 'instructions', 'images'

            // Clean name
            const name = ex.name.trim();

            const primaryMuscle = ex.primaryMuscles && ex.primaryMuscles.length > 0 ? ex.primaryMuscles[0] : 'full_body';
            const muscleGroup = muscleMap[primaryMuscle] || 'full_body';

            let instructions = ex.instructions ? ex.instructions.join('\n') : '';

            // Embed Image in Description
            let imageMarkdown = '';
            if (ex.images && ex.images.length > 0) {
                const imageUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${ex.images[0]}`;
                imageMarkdown = `\n\n![Demonstration](${imageUrl})`;
            }

            const description = `## Overview\n${instructions}${imageMarkdown}`;

            exercisesToInsert.push({
                name: name,
                muscle_group: muscleGroup,
                video_url: '',
                description: description,
                is_public: true
            });
        }

        console.log(`📦 Preparando para inserir ${exercisesToInsert.length} itens no Supabase...`);

        const batchSize = 50;
        for (let i = 0; i < exercisesToInsert.length; i += batchSize) {
            const batch = exercisesToInsert.slice(i, i + batchSize);
            const { error } = await supabase
                .from('exercises')
                .upsert(batch, { onConflict: 'name', ignoreDuplicates: true });

            if (error) {
                console.error(`❌ Erro no lote ${i}-${i + batchSize}:`, error.message);
            } else {
                console.log(`✅ Lote ${i / batchSize + 1} processado (${i + batch.length}/${exercisesToInsert.length})`);
            }
        }

        console.log('🎉 Importação concluída!');

    } catch (error) {
        console.error(error);
    }
}

processExercises();
