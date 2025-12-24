
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manual .env parsing
function loadEnv() {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) return {}; // Try .env if local doesn't exist? 
    // Actually, usually .env.local is what we want.

    const content = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
        // Basic parsing, ignoring comments
        if (line.startsWith('#')) return;
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
            env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, ''); // Remove quotes
        }
    });
    return env;
}

const env = loadEnv();
const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Dictionary of Terms
const dictionary = [
    // Equipment Suffixes (Moved to end)
    { en: /Barbell (.*)/i, pt: "$1 com Barra" }, // Prefix to Suffix move often needed, but simple replacement first
    // Common Patterns
    { en: /Dumbbell (.*)/i, pt: "$1 com Halteres" },

    // Specific Exercises
    { en: "Squat", pt: "Agachamento" },
    { en: "Bench Press", pt: "Supino" },
    { en: "Deadlift", pt: "Levantamento Terra" },
    { en: "Leg Press", pt: "Leg Press" }, // Same
    { en: "Lunge", pt: "Afundo" },
    { en: "Push Up", pt: "Flexão de Braço" },
    { en: "Pull Up", pt: "Barra Fixa" },
    { en: "Chin Up", pt: "Barra Fixa (Supinada)" },
    { en: "Shoulder Press", pt: "Desenvolvimento de Ombros" },
    { en: "Overhead Press", pt: "Desenvolvimento" },
    { en: "Lateral Raise", pt: "Elevação Lateral" },
    { en: "Front Raise", pt: "Elevação Frontal" },
    { en: "Calf Raise", pt: "Elevação de Panturrilha" },
    { en: "Seated Calf Raise", pt: "Elevação de Panturrilha Sentado" },
    { en: "Bicep Curl", pt: "Rosca Direta" },
    { en: "Hammer Curl", pt: "Rosca Martelo" },
    { en: "Tricep Extension", pt: "Extensão de Tríceps" },
    { en: "Tricep Pushdown", pt: "Tríceps na Polia" },
    { en: "Skullcrusher", pt: "Tríceps Testa" },
    { en: "Cable Row", pt: "Remada Baixa no Cabo" },
    { en: "Lat Pulldown", pt: "Puxada Alta" },
    { en: "Face Pull", pt: "Face Pull" },
    { en: "Crunch", pt: "Abdominal" },
    { en: "Slam Ball", pt: "Slam Ball" }, // Same
    { en: "Kettlebell Swing", pt: "Swing com Kettlebell" },
    { en: "Box Jump", pt: "Salto na Caixa" },
    { en: "Burpee", pt: "Burpee" }, // Same
    { en: "Plank", pt: "Prancha" },
    { en: "Mountain Climber", pt: "Alpinista" },
    { en: "Russian Twist", pt: "Giro Russo" },
    { en: "Leg Extension", pt: "Cadeira Extensora" },
    { en: "Leg Curl", pt: "Mesa Flexora" },
    { en: "Stiff Leg Deadlift", pt: "Stiff" },
    { en: "Romanian Deadlift", pt: "Levantamento Terra Romeno" },
    { en: "Good Morning", pt: "Bom Dia" },
    { en: "Hip Thrust", pt: "Elevação Pélvica" },
    { en: "Glute Bridge", pt: "Ponte de Glúteos" },
    { en: "Abductor", pt: "Cadeira Abdutora" },
    { en: "Adductor", pt: "Cadeira Adutora" },
    { en: "Fly", pt: "Crucifixo" },
    { en: "Reverse Fly", pt: "Crucifixo Inverso" },
    { en: "Incline", pt: "Inclinado" },
    { en: "Decline", pt: "Declinado" },
    { en: "Seated", pt: "Sentado" },
    { en: "Standing", pt: "Em Pé" },
    { en: "One Arm", pt: "Unilateral" },
    { en: "Single Leg", pt: "Unilateral" },
    { en: "Alternating", pt: "Alternado" },
    { en: "Cable", pt: "no Cabo" },
    { en: "Machine", pt: "na Máquina" },
    { en: "Smith", pt: "no Smith" },
    { en: "Wide Grip", pt: "Pegada Aberta" },
    { en: "Close Grip", pt: "Pegada Fechada" },
    { en: "Reverse Grip", pt: "Pegada Invertida" },
    { en: "Neutral Grip", pt: "Pegada Neutra" },
];

const descriptionReplacements = [
    { en: /## Overview/g, pt: "## Visão Geral" },
    { en: /Starting position/gi, pt: "posição inicial" },
    { en: /Repeat for the recommended amount of repetitions/gi, pt: "Repita pela quantidade recomendada de repetições" },
    { en: /Tip:/gi, pt: "Dica:" },
    { en: /Note:/gi, pt: "Nota:" },
    { en: /Exhale/gi, pt: "Expire" },
    { en: /Inhale/gi, pt: "Inspire" },
    { en: /Hold for/gi, pt: "Segure por" },
    { en: /seconds/gi, pt: "segundos" },
];

async function translateExercises() {
    console.log("Fetching exercises...");
    const { data: exercises, error } = await supabase
        .from('exercises')
        .select('id, name, description')
        .order('name');

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    console.log(`Found ${exercises.length} exercises. Processing...`);

    let updatedCount = 0;

    for (const ex of exercises) {
        let newName = ex.name;
        let newDesc = ex.description;

        // Translate Name
        let nameChanged = false;
        for (const term of dictionary) {
            if (typeof term.en === 'string') {
                if (newName.toLowerCase().includes(term.en.toLowerCase())) {
                    // Simple replacement isn't enough for word reordering (e.g. Barbell Squat -> Agachamento com Barra)
                    // But let's try a regex approach for specific patterns first, then general substitution
                    const regex = new RegExp(`\\b${term.en}\\b`, 'gi');
                    if (regex.test(newName)) {
                        newName = newName.replace(regex, term.pt);
                        nameChanged = true;
                    }
                }
            } else {
                // Regex pattern
                if (term.en.test(newName)) {
                    newName = newName.replace(term.en, term.pt);
                    nameChanged = true;
                }
            }
        }

        // Fix Grammar/Ordering (Basic heuristic)
        // E.g. "Com Barra Agachamento" -> "Agachamento com Barra" if we naively replaced.
        // Actually, "Barbell Squat" -> "Barbell" replaced by "com Barra" -> "com Barra Squat" -> "com Barra Agachamento"... terrible.
        // Better strategy: Replace the *Whole Phrase* if possible, or use specific ordering.
        // Revised Strategy:
        // 1. Check for "Barbell X" -> "X com Barra"

        // Let's refine the name translation logic inside the loop to be smarter.

        // ... (Use a more advanced logic or just apply the dictionary and hope for "Agachamento com Barra" if dictionary has "Barbell Squat" -> "Agachamento com Barra")

        // For now, let's stick to the dictionary list above being processed in ORDER.
        // I should put specific full phrases at the top of the dictionary.

        // Translate Description
        let descChanged = false;
        if (newDesc) {
            for (const term of descriptionReplacements) {
                if (term.en.test(newDesc)) {
                    newDesc = newDesc.replace(term.en, term.pt);
                    descChanged = true;
                }
            }
        }

        if (nameChanged || descChanged) {
            if (newName !== ex.name || newDesc !== ex.description) {
                const { error: updateError } = await supabase
                    .from('exercises')
                    .update({ name: newName, description: newDesc })
                    .eq('id', ex.id);

                if (updateError) {
                    console.error(`Error updating ${ex.name}:`, updateError);
                } else {
                    console.log(`Updated: ${ex.name} -> ${newName}`);
                    updatedCount++;
                }
            }
        }
    }

    console.log(`Done! Updated ${updatedCount} exercises.`);
}

translateExercises();
