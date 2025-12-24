
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read .env.local manually to avoid 'dotenv' dependency
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = env['VITE_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

// 2. Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 3. Load Metadata
const metaPath = path.resolve(__dirname, 'hevy_metadata.json');
if (!fs.existsSync(metaPath)) {
    console.error('❌ hevy_metadata.json not found!');
    process.exit(1);
}
const exercises = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

// 4. Translation Dictionary (Same as before)
const dictionary = {
    "Barbell": "Barra",
    "Dumbbell": "Halteres",
    "Machine": "Máquina",
    "Cable": "Cabo",
    "Band": "Elástico",
    "Smith Machine": "Smith",
    "Kettlebell": "Kettlebell",
    "Bodyweight": "Peso do Corpo",
    "Weighted": "Com Peso",
    "Assisted": "Assistido",
    "Bench Press": "Supino",
    "Incline Bench Press": "Supino Inclinado",
    "Decline Bench Press": "Supino Declinado",
    "Squat": "Agachamento",
    "Deadlift": "Levantamento Terra",
    "Sumo Deadlift": "Levantamento Terra Sumô",
    "Romanian Deadlift": "Stiff / RDL",
    "Bicep Curl": "Rosca Direta",
    "Hammer Curl": "Rosca Martelo",
    "Triceps Pushdown": "Tríceps Pulley",
    "Triceps Extension": "Tríceps Testa",
    "Skullcrusher": "Tríceps Testa",
    "Overhead Extension": "Tríceps Francês",
    "Lateral Raise": "Elevação Lateral",
    "Front Raise": "Elevação Frontal",
    "Shoulder Press": "Desenvolvimento",
    "Overhead Press": "Desenvolvimento Militar",
    "Arnold Press": "Desenvolvimento Arnold",
    "Pull Up": "Barra Fixa",
    "Chin Up": "Barra Fixa (Supinada)",
    "Lat Pulldown": "Puxada Alta",
    "Seated Row": "Remada Sentada",
    "Bent Over Row": "Remada Curvada",
    "T-Bar Row": "Remada Cavalinho",
    "Face Pull": "Face Pull",
    "Leg Press": "Leg Press",
    "Leg Extension": "Cadeira Extensora",
    "Leg Curl": "Mesa Flexora",
    "Lying Leg Curl": "Mesa Flexora",
    "Seated Leg Curl": "Cadeira Flexora",
    "Calf Raise": "Elevação de Panturrilha",
    "Calf Press": "Panturrilha no Leg Press",
    "Crunch": "Abdominal",
    "Plank": "Prancha",
    "Russian Twist": "Giro Russo",
    "Hanging Leg Raise": "Elevação de Pernas Suspenso",
    "Dip": "Mergulho",
    "Chest Dip": "Mergulho nas Paralelas",
    "Fly": "Crucifixo",
    "Chest Fly": "Crucifixo",
    "Reverse Fly": "Crucifixo Inverso",
    "Hip Thrust": "Elevação Pélvica",
    "Lunge": "Afundo",
    "Bulgarian Split Squat": "Agachamento Búlgaro",
    "Box Jump": "Salto na Caixa",
    "Burpee": "Burpee",
    "Clean and Jerk": "Arremesso",
    "Snatch": "Arranco",
    "Shrug": "Encolhimento",
    "Good Morning": "Bom Dia",
    "Push Up": "Flexão de Braço",
    "Pull Through": "Pull Through",
    "Pallof Press": "Pallof Press",
    "Farmer's Walk": "Caminhada de Fazendeiro",
    "Wrist Curl": "Rosca de Punho"
};

function translateName(name) {
    let newName = name;
    const match = name.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
        let base = match[1];
        let equipment = match[2];
        for (const [en, pt] of Object.entries(dictionary)) {
            if (base.toLowerCase() === en.toLowerCase()) base = pt;
        }
        for (const [en, pt] of Object.entries(dictionary)) {
            if (equipment.toLowerCase() === en.toLowerCase()) equipment = pt;
        }
        return `${base} (${equipment})`;
    }
    for (const [en, pt] of Object.entries(dictionary)) {
        if (name.toLowerCase() === en.toLowerCase()) return pt;
        if (name.includes(en)) {
            newName = newName.replace(en, pt);
        }
    }
    return newName;
}

function getMuscleGroup(name) {
    name = name.toLowerCase();
    if (name.includes('chest') || name.includes('bench') || name.includes('fly') || name.includes('push up') || name.includes('supino') || name.includes('crucifixo')) return 'chest';
    if (name.includes('back') || name.includes('row') || name.includes('pull') || name.includes('chin') || name.includes('lat') || name.includes('remada') || name.includes('puxada')) return 'back';
    if (name.includes('leg') || name.includes('squat') || name.includes('deadlift') || name.includes('lunge') || name.includes('calf') || name.includes('agachamento') || name.includes('terra')) return 'legs';
    if (name.includes('shoulder') || name.includes('press') || name.includes('raise') || name.includes('desenvolvimento') || name.includes('elevação')) return 'shoulders';
    if (name.includes('bicep') || name.includes('tricep') || name.includes('curl') || name.includes('extension') || name.includes('rosca') || name.includes('tríceps')) return 'arms';
    if (name.includes('abs') || name.includes('crunch') || name.includes('plank') || name.includes('abdominal')) return 'abs';
    return 'full_body';
}

async function main() {
    console.log(`📡 Connecting to Supabase...`);
    const recordsToUpsert = [];
    const uniqueNames = new Set();

    let skipped = 0;

    for (const ex of exercises) {
        // Skip generic
        if (ex.name === 'Exercise' || ex.name === 'Hevy') {
            skipped++;
            continue;
        }

        const translatedName = translateName(ex.name);

        if (uniqueNames.has(translatedName)) {
            skipped++;
            continue;
        }
        uniqueNames.add(translatedName);

        const muscle = getMuscleGroup(ex.name);

        // Prepare record
        recordsToUpsert.push({
            name: translatedName,
            video_url: ex.video_local_path,
            description: `## Execução\n${ex.instructions || ''}`,
            is_public: true,
            muscle_group: muscle
        });
    }

    console.log(`📝 Prepared ${recordsToUpsert.length} exercises for insertion (Skipped ${skipped} duplicates/generics).`);

    // Try Direct Insert
    const BATCH_SIZE = 50;
    let success = true;
    for (let i = 0; i < recordsToUpsert.length; i += BATCH_SIZE) {
        const batch = recordsToUpsert.slice(i, i + BATCH_SIZE);
        console.log(`🚀 Inserting batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

        const { error } = await supabase
            .from('exercises')
            .upsert(batch, { onConflict: 'name' });

        if (error) {
            console.error('❌ Error inserting batch:', error.message);
            if (error.code === '42501') {
                console.warn('⚠️  RLS Policy Violation: You likely need the SERVICE_ROLE_KEY to bypass this.');
            }
            success = false;
        } else {
            console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} inserted successfully.`);
        }
    }

    if (!success) {
        console.log('\n⚠️  Direct insertion failed. Generating SQL fallback...');
        let sql = `INSERT INTO exercises (name, video_url, description, is_public, muscle_group) VALUES\n`;
        const values = recordsToUpsert.map(r => {
            const safeName = r.name.replace(/'/g, "''");
            const safeDesc = r.description.replace(/'/g, "''").replace(/\n/g, '\\n');
            return `('${safeName}', '${r.video_url}', '${safeDesc}', true, '${r.muscle_group}')`;
        });
        sql += values.join(',\n');
        sql += `\nON CONFLICT (name) DO UPDATE SET video_url = EXCLUDED.video_url, description = EXCLUDED.description;`;

        const sqlPath = path.resolve(__dirname, 'insert_hevy_fallback.sql');
        fs.writeFileSync(sqlPath, sql);
        console.log(`✅ SQL Fallback generated at: ${sqlPath}`);
        console.log('👉 Please execute this SQL in your Supabase SQL Editor.');
    } else {
        console.log('🎉 All exercises inserted successfully!');
    }
}

main();
