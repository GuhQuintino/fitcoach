export const STUDENT_DEMO_ROUTINE = {
    id: 'tutorial-routine',
    name: 'Hipertrofia e força · Demonstração',
    description: JSON.stringify({ duration: '50', level: 'Intermediário', frequency: '3', notes: 'Rotina de demonstração do tutorial.' }),
};

export const STUDENT_DEMO_WORKOUTS = [
    { id: 'tutorial-demo', name: 'Treino A · Superiores', description: 'Peitoral, ombros e tríceps', duration_minutes: 50 },
    { id: 'tutorial-demo-b', name: 'Treino B · Inferiores', description: 'Quadríceps e posteriores', duration_minutes: 50 },
    { id: 'tutorial-demo-c', name: 'Treino C · Costas', description: 'Costas e bíceps', duration_minutes: 50 },
];

/** Fresh objects for every mount; demo edits cannot leak to another screen/session. */
export function createStudentDemoExercises() {
    const base = {
        weight: '', reps: '', rpe: '', completed: false, rest_seconds: 60,
        weight_target: 20, reps_target: '10', rpe_target: '6', prev_log: '20kg x 10 @6',
        set_method: 'standard', execution_mode: 'standard', timer_mode: 'standard',
    };
    return [{
        id: 'tutorial-exercise', workout_item_id: 'tutorial-item',
        name: 'Supino reto com barra', exercise_type: 'reps' as const,
        video_url: '/exercises/supino-reto-com-barra.gif',
        description: '## Preparação\nApoie os pés no chão e mantenha o tronco estável.\n## Execução passo a passo\nDesça a barra com controle e empurre para cima, seguindo as orientações do coach.\n## Onde sentir\nPeitoral e tríceps.\n## Erros comuns\nEvite perder o apoio dos pés ou descer sem controle.',
        notes: 'Mantenha a descida controlada e peça ajuda para posicionar a barra, se necessário.',
        feedback: '',
        sets: [
            { ...base, id: 'tutorial-warmup', type: 'warmup' },
            { ...base, id: 'tutorial-working', type: 'working', weight_target: 30, reps_target: '8-12', rpe_target: '8' },
            { ...base, id: 'tutorial-dropset', type: 'working', set_method: 'dropset', drop_count: 2, drops: [{ weight: '', reps: '', completed: false }, { weight: '', reps: '', completed: false }] },
        ],
    }];
}
