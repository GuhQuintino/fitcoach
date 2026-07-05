export const SUB_MUSCLE_LABELS: Record<string, string> = {
    peitoral: 'Peitoral',
    triceps: 'Tríceps',
    biceps: 'Bíceps',
    ombro_anterior: 'Ombro Anterior',
    ombro_lateral: 'Ombro Lateral',
    ombro_posterior: 'Ombro Posterior',
    upperback: 'Costas Superior',
    latissimo: 'Dorsal (Latíssimo)',
    quadriceps: 'Quadríceps',
    gluteos: 'Glúteos',
    isquiotibiais: 'Posterior de Coxa',
    panturrilha: 'Panturrilha',
    abs: 'Abdômen',
    cardio: 'Cardio / Aeróbico',
    antebraco: 'Antebraço',
    lombar: 'Lombar',
    trapezio: 'Trapézio'
};

/**
 * Normaliza as chaves e pesos de ativação muscular de um exercício.
 * Consolida chaves inconsistentes, duplicadas ou legadas para os subgrupos oficiais.
 */
export const normalizeMuscleWeights = (weights: Record<string, number | null | undefined> | null | undefined): Record<string, number> => {
    const normalized: Record<string, number> = {};
    if (!weights) return normalized;

    Object.entries(weights).forEach(([muscle, weight]) => {
        if (weight === null || weight === undefined) return;
        const numericWeight = typeof weight === 'string' ? parseFloat(weight) : weight;
        if (isNaN(numericWeight) || numericWeight <= 0) return;

        // Normalização de chaves para minúsculo, sem espaços extras
        const key = muscle.toLowerCase().trim();

        // Mapeamentos de consolidação
        if (key === 'abdome' || key === 'abdômen' || key === 'abdomen' || key === 'abs') {
            normalized['abs'] = (normalized['abs'] || 0) + numericWeight;
        } else if (key === 'posterior' || key === 'posterior_de_coxa' || key === 'isquiotibiais' || key === 'posterior de coxa') {
            normalized['isquiotibiais'] = (normalized['isquiotibiais'] || 0) + numericWeight;
        } else if (key === 'costas') {
            // Divide costas igualmente entre dorsal (latissimo) e costas superior (upperback)
            normalized['upperback'] = (normalized['upperback'] || 0) + (numericWeight * 0.5);
            normalized['latissimo'] = (normalized['latissimo'] || 0) + (numericWeight * 0.5);
        } else if (key === 'deltoide' || key === 'ombro' || key === 'ombros') {
            // Divide deltoide igualmente entre as 3 partes do ombro
            normalized['ombro_anterior'] = (normalized['ombro_anterior'] || 0) + (numericWeight * 0.33);
            normalized['ombro_lateral'] = (normalized['ombro_lateral'] || 0) + (numericWeight * 0.33);
            normalized['ombro_posterior'] = (normalized['ombro_posterior'] || 0) + (numericWeight * 0.34);
        } else {
            // Se já for uma das chaves oficiais ou qualquer outra
            normalized[key] = (normalized[key] || 0) + numericWeight;
        }
    });

    return normalized;
};
