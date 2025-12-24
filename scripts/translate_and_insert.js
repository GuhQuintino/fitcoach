
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const metaPath = path.resolve(__dirname, 'hevy_metadata.json');
const exercises = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

// Translation Dictionary
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

    // Parenthesis handling: "Bench Press (Barbell)" -> "Supino (Barra)"
    const match = name.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
        let base = match[1];
        let equipment = match[2];

        // Translate base
        for (const [en, pt] of Object.entries(dictionary)) {
            if (base.toLowerCase() === en.toLowerCase()) base = pt;
        }

        // Translate equipment
        for (const [en, pt] of Object.entries(dictionary)) {
            if (equipment.toLowerCase() === en.toLowerCase()) equipment = pt;
        }

        return `${base} (${equipment})`;
    }

    // Direct matches
    for (const [en, pt] of Object.entries(dictionary)) {
        // Whole word match roughly
        if (name.toLowerCase() === en.toLowerCase()) return pt;
        // Partial replacement?
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
    if (name.includes('abs') || name.includes('crunch') || name.includes('plank') || name.includes('abdominal')) return 'core';
    return 'full_body';
}

let sql = `INSERT INTO exercises (name, video_url, description, is_public, muscle_group) VALUES\n`;
const values = [];

const uniqueNames = new Set();

exercises.forEach(ex => {
    // Skip generic "Exercise" or dupes
    if (ex.name === 'Exercise' || ex.name === 'Hevy') return;

    const translatedName = translateName(ex.name);

    if (uniqueNames.has(translatedName)) return;
    uniqueNames.add(translatedName);

    const muscle = getMuscleGroup(ex.name);
    // Escape quotes
    const desc = (ex.instructions || '').replace(/'/g, "''").replace(/\n/g, '\\n');
    const safeName = translatedName.replace(/'/g, "''");

    values.push(`('${safeName}', '${ex.video_local_path}', '## Execução\\n${desc}', true, '${muscle}')`);
});

sql += values.join(',\n');
sql += `\nON CONFLICT (name) DO UPDATE SET video_url = EXCLUDED.video_url, description = EXCLUDED.description;`;

fs.writeFileSync(path.resolve(__dirname, 'insert_hevy_mass.sql'), sql);
console.log(`Generated SQL for ${values.length} exercises.`);
