
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://nnaadrcmrmkwxbxhzbcx.supabase.co';
const supabaseKey = 'sb_publishable_Ol2D3B0-3w1_Yx3jNXBw7Q_atotIFir';

if (!supabaseKey) {
    console.error('Error: VITE_SUPABASE_ANON_KEY is not defined.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    console.log('--- Debugging Data ---');

    // 1. List all profiles to see who exists
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, email, role, full_name, status');

    if (pError) console.error('Error fetching profiles:', pError);
    else {
        console.log(`Found ${profiles?.length || 0} profiles:`);
        profiles?.forEach(p => console.log(` - ${p.role}: ${p.email} (${p.full_name}) [${p.status}] ID: ${p.id}`));
    }

    // 2. List all student_assignments
    const { data: assignments, error: aError } = await supabase
        .from('student_assignments')
        .select('*');

    if (aError) console.error('Error fetching assignments:', aError);
    else {
        console.log(`Found ${assignments?.length || 0} assignments:`);
        assignments?.forEach(a => console.log(` - Coach: ${a.coach_id} <-> Student: ${a.student_id} (Active: ${a.is_active})`));
    }

    // 3. Check specific coach (Gustavo if we can find him)
    const coach = profiles?.find(p => p.role === 'coach');
    if (coach) {
        console.log(`\nChecking specific assignments for Coach ${coach.full_name} (${coach.id}):`);
        const { count, error: cError } = await supabase
            .from('student_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('coach_id', coach.id);

        console.log(` - Count via .eq('coach_id'): ${count}`);
        if (cError) console.error(' - Error counting:', cError);
    }
}

debugData();
