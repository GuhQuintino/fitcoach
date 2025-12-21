import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nnaadrcmrmkwxbxhzbcx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ol2D3B0-3w1_Yx3jNXBw7Q_atotIFir'; // Simplified from output

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyRLS() {
    console.log("🔍 Iniciando Verificação de RLS...");

    // 1. Test Public Exercises Access (Anonymous)
    // Expectation: Should return specific public exercises IF policy allows anon, OR empty/error if auth required.
    // My policy: "Everyone sees public exercises" -> coach_id IS NULL.
    // Does 'Everyone' include anon? Yes, unless restricted to authenticated role.
    // Let's check results.
    const { data: publicExercises, error: publicError } = await supabase
        .from('exercises')
        .select('*')
        .is('coach_id', null);

    if (publicError) {
        console.error("❌ Erro ao buscar exercícios públicos:", publicError.message);
    } else {
        console.log(`✅ Exercícios Públicos encontrados (Anônimo): ${publicExercises.length}`);
        if (publicExercises.length > 0) {
            console.log("   -> Conteúdo visível para não logados (Correto para marketing, revisar se desejado).");
        } else {
            console.log("   -> Nenhum exercício público visível (Talvez precise de login).");
        }
    }

    // 2. Test Private Exercises Access (Anonymous)
    // Expectation: Should return 0.
    const { data: privateExercises, error: privateError } = await supabase
        .from('exercises')
        .select('*')
        .not('coach_id', 'is', null);

    if (privateError) {
        console.error("❌ Erro ao buscar exercícios privados:", privateError.message);
    } else {
        const count = privateExercises ? privateExercises.length : 0;
        if (count === 0) {
            console.log("✅ Segurança OK: Anônimo não vê exercícios privados.");
        } else {
            console.error("🚨 FALHA DE SEGURANÇA: Anônimo está vendo exercícios privados!");
        }
    }
}

verifyRLS();
