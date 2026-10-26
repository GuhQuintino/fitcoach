export type ActivityLevelKey = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | 'intense' | 'very_intense';

export interface ActivityLevelOption {
    id: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    label: string;
    shortLabel: string;
    description: string;
    multiplier: number;
}

export const DEFAULT_METABOLIC_AGE = 30;

export const ACTIVITY_LEVEL_OPTIONS: ActivityLevelOption[] = [
    {
        id: 'sedentary',
        label: 'Sedentário',
        shortLabel: 'Sedentário',
        description: 'Pouco ou nenhum exercício semanal',
        multiplier: 1.2
    },
    {
        id: 'light',
        label: 'Leve (1 a 2x/sem)',
        shortLabel: 'Leve',
        description: 'Treinos leves 1 a 2 dias por semana',
        multiplier: 1.375
    },
    {
        id: 'moderate',
        label: 'Moderado (3 a 4x/sem)',
        shortLabel: 'Moderado',
        description: 'Treinos moderados 3 a 4 dias por semana',
        multiplier: 1.55
    },
    {
        id: 'active',
        label: 'Intenso (5 a 6x/sem)',
        shortLabel: 'Intenso',
        description: 'Treinos intensos 5 a 6 dias por semana',
        multiplier: 1.725
    },
    {
        id: 'very_active',
        label: 'Muito Intenso (Diário/2x)',
        shortLabel: 'Muito Intenso',
        description: 'Treinos muito intensos diários ou 2x ao dia',
        multiplier: 1.9
    }
];

export const ACTIVITY_MULTIPLIERS: Record<string, { levelKey: ActivityLevelOption['id']; label: string; multiplier: number }> = {
    sedentary: { levelKey: 'sedentary', label: 'Sedentário', multiplier: 1.2 },
    light: { levelKey: 'light', label: 'Leve (1 a 2x/sem)', multiplier: 1.375 },
    moderate: { levelKey: 'moderate', label: 'Moderado (3 a 4x/sem)', multiplier: 1.55 },
    active: { levelKey: 'active', label: 'Intenso (5 a 6x/sem)', multiplier: 1.725 },
    intense: { levelKey: 'active', label: 'Intenso (5 a 6x/sem)', multiplier: 1.725 },
    very_active: { levelKey: 'very_active', label: 'Muito Intenso (Diário/2x)', multiplier: 1.9 },
    very_intense: { levelKey: 'very_active', label: 'Muito Intenso (Diário/2x)', multiplier: 1.9 }
};

/**
 * Sanitiza e normaliza o peso em kg.
 * Corrige erros comuns de digitação (ex: 750 -> 75.0 kg, 75000 -> 75.0 kg)
 * e valida faixa humana plausível [25, 250] kg.
 */
export function sanitizeWeightKg(rawWeight: number | string | null | undefined): number | null {
    if (rawWeight === null || rawWeight === undefined || rawWeight === '') {
        return null;
    }

    const parsed = typeof rawWeight === 'number'
        ? rawWeight
        : parseFloat(String(rawWeight).trim().replace(',', '.'));

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    let normalized = parsed;

    if (normalized > 250 && normalized <= 2500) {
        normalized = Math.round((normalized / 10) * 10) / 10;
    } else if (normalized > 2500 && normalized <= 250000) {
        normalized = Math.round((normalized / 1000) * 10) / 10;
    }

    if (normalized < 25 || normalized > 250) {
        return null;
    }

    return Math.round(normalized * 10) / 10;
}

export const normalizeWeightKg = sanitizeWeightKg;

/**
 * Sanitiza e normaliza a altura em cm.
 * Converte valores em metros [1.0, 2.5] para cm (ex: 1.75 -> 175 cm)
 * e milímetros [1000, 2500] para cm (ex: 1750 -> 175 cm), validando [100, 250] cm.
 */
export function sanitizeHeightCm(rawHeight: number | string | null | undefined): number | null {
    if (rawHeight === null || rawHeight === undefined || rawHeight === '') {
        return null;
    }

    const parsed = typeof rawHeight === 'number'
        ? rawHeight
        : parseFloat(String(rawHeight).trim().replace(',', '.'));

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    let normalized = parsed;

    if (normalized >= 1.0 && normalized <= 2.5) {
        normalized = Math.round(normalized * 100);
    } else if (normalized > 250 && normalized <= 2500) {
        normalized = Math.round(normalized / 10);
    }

    if (normalized < 100 || normalized > 250) {
        return null;
    }

    return Math.round(normalized);
}

export const normalizeHeightCm = sanitizeHeightCm;

/**
 * Calcula a idade exata a partir de birth_date (YYYY-MM-DD ou ISO).
 * Caso ausente ou fora da faixa [10, 100], usa fallbackAge válido ou 30 anos.
 */
export function calculateAgeFromBirthDate(
    birthDate?: string | null,
    fallbackAge?: number | string | null,
    referenceDate: Date = new Date()
): number {
    if (birthDate && typeof birthDate === 'string' && birthDate.trim()) {
        const trimmed = birthDate.trim();
        const dateParts = trimmed.split('T')[0].split('-');
        let dob: Date | null = null;

        if (dateParts.length === 3) {
            const year = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const day = parseInt(dateParts[2], 10);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                dob = new Date(Date.UTC(year, month, day));
            }
        } else {
            const parsedDate = new Date(trimmed);
            if (!isNaN(parsedDate.getTime())) {
                dob = parsedDate;
            }
        }

        if (dob && !isNaN(dob.getTime())) {
            let age = referenceDate.getUTCFullYear() - dob.getUTCFullYear();
            const monthDiff = referenceDate.getUTCMonth() - dob.getUTCMonth();
            if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getUTCDate() < dob.getUTCDate())) {
                age--;
            }

            if (age >= 10 && age <= 100) {
                return age;
            }
        }
    }

    if (fallbackAge !== null && fallbackAge !== undefined && fallbackAge !== '') {
        const parsedFallback = typeof fallbackAge === 'number' ? fallbackAge : parseInt(String(fallbackAge), 10);
        if (Number.isFinite(parsedFallback) && parsedFallback >= 10 && parsedFallback <= 100) {
            return Math.round(parsedFallback);
        }
    }

    return DEFAULT_METABOLIC_AGE;
}

export const calculateExactAge = calculateAgeFromBirthDate;

/**
 * Resolve o multiplicador de atividade física a partir da preferência explícita
 * ou da frequência semanal da rotina ativa.
 */
export function resolveActivityMultiplier(
    activityLevel?: string | null,
    weeklyFrequency?: number | string | null
): { levelKey: ActivityLevelOption['id']; label: string; multiplier: number } {
    if (activityLevel && typeof activityLevel === 'string') {
        const normalizedKey = activityLevel.trim().toLowerCase();
        if (ACTIVITY_MULTIPLIERS[normalizedKey]) {
            return ACTIVITY_MULTIPLIERS[normalizedKey];
        }
    }

    if (weeklyFrequency !== null && weeklyFrequency !== undefined && weeklyFrequency !== '') {
        const freq = typeof weeklyFrequency === 'number'
            ? weeklyFrequency
            : parseInt(String(weeklyFrequency).replace(/\D/g, ''), 10);

        if (Number.isFinite(freq)) {
            if (freq <= 0) return ACTIVITY_MULTIPLIERS.sedentary;
            if (freq <= 2) return ACTIVITY_MULTIPLIERS.light;
            if (freq <= 4) return ACTIVITY_MULTIPLIERS.moderate;
            if (freq <= 6) return ACTIVITY_MULTIPLIERS.active;
            return ACTIVITY_MULTIPLIERS.very_active;
        }
    }

    return ACTIVITY_MULTIPLIERS.light;
}

export interface MetabolicProfileInput {
    weightKg?: number | string | null;
    heightCm?: number | string | null;
    birthDate?: string | null;
    age?: number | string | null;
    gender?: string | null;
    activityLevel?: string | null;
    weeklyFrequency?: number | string | null;
    referenceDate?: Date;
}

export interface MetabolicProfileResult {
    tmb: number;
    bmr: number;
    maintenance: number;
    tdee: number;
    sanitizedWeightKg: number | null;
    sanitizedHeightCm: number | null;
    resolvedAge: number;
    activityLevelKey: ActivityLevelOption['id'];
    activityLabel: string;
    activityMultiplier: number;
    isValid: boolean;
    wasNormalized: boolean;
    warnings: string[];
}

/**
 * Calcula TMB/BMR via equação de Mifflin-St Jeor e Gasto de Manutenção (TDEE)
 * com sanitização automática de entradas.
 */
export function calculateMetabolicProfile(input: MetabolicProfileInput): MetabolicProfileResult {
    const warnings: string[] = [];
    const sanitizedWeightKg = sanitizeWeightKg(input.weightKg);
    const sanitizedHeightCm = sanitizeHeightCm(input.heightCm);
    const resolvedAge = calculateAgeFromBirthDate(input.birthDate, input.age, input.referenceDate);
    const activity = resolveActivityMultiplier(input.activityLevel, input.weeklyFrequency);

    const rawWeightNum = input.weightKg !== null && input.weightKg !== undefined && input.weightKg !== ''
        ? parseFloat(String(input.weightKg).replace(',', '.'))
        : null;
    const rawHeightNum = input.heightCm !== null && input.heightCm !== undefined && input.heightCm !== ''
        ? parseFloat(String(input.heightCm).replace(',', '.'))
        : null;

    let wasNormalized = false;

    if (sanitizedWeightKg !== null && rawWeightNum !== null && Math.abs(rawWeightNum - sanitizedWeightKg) > 0.05) {
        wasNormalized = true;
        warnings.push(`Peso normalizado de ${rawWeightNum} para ${sanitizedWeightKg} kg.`);
    }
    if (sanitizedHeightCm !== null && rawHeightNum !== null && Math.abs(rawHeightNum - sanitizedHeightCm) > 0.5) {
        wasNormalized = true;
        warnings.push(`Altura normalizada de ${rawHeightNum} para ${sanitizedHeightCm} cm.`);
    }

    if (sanitizedWeightKg === null || sanitizedHeightCm === null) {
        return {
            tmb: 0,
            bmr: 0,
            maintenance: 0,
            tdee: 0,
            sanitizedWeightKg,
            sanitizedHeightCm,
            resolvedAge,
            activityLevelKey: activity.levelKey,
            activityLabel: activity.label,
            activityMultiplier: activity.multiplier,
            isValid: false,
            wasNormalized,
            warnings
        };
    }

    const base = (10 * sanitizedWeightKg) + (6.25 * sanitizedHeightCm) - (5 * resolvedAge);
    const genderKey = (input.gender || 'male').toLowerCase();

    let genderOffset = 5;
    if (genderKey === 'female') {
        genderOffset = -161;
    } else if (genderKey === 'other') {
        genderOffset = -78;
    }

    const tmb = Math.max(0, Math.round(base + genderOffset));
    const maintenance = Math.round(tmb * activity.multiplier);

    return {
        tmb,
        bmr: tmb,
        maintenance,
        tdee: maintenance,
        sanitizedWeightKg,
        sanitizedHeightCm,
        resolvedAge,
        activityLevelKey: activity.levelKey,
        activityLabel: activity.label,
        activityMultiplier: activity.multiplier,
        isValid: tmb > 0,
        wasNormalized,
        warnings
    };
}
