import {
    HabitInferenceResult,
    ProfileCompletenessResult,
    EligibilityParams,
    EligibilityResult,
    NotificationPreferences
} from '../types/notifications';

export interface WorkoutLogSample {
    started_at: string;
}

export interface ProfileSample {
    avatar_url?: string | null;
}

export interface StudentDataSample {
    weight_kg?: number | null;
    birth_date?: string | null;
    age?: number | null;
    height_cm?: number | null;
}

/**
 * Converte string no formato "HH:mm" para minutos desde a meia-noite (0 - 1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return (hours % 24) * 60 + (minutes % 60);
}

/**
 * Converte minutos desde a meia-noite em string no formato "HH:mm".
 */
export function formatTimeMinutes(minutes: number): string {
    const normalized = Math.max(0, Math.floor(minutes)) % 1440;
    const hours = Math.floor(normalized / 60);
    const mins = normalized % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Verifica se um dado horário está dentro da janela de quiet hours (mesmo atravessando meia-noite).
 */
export function isTimeInQuietHours(
    currentTime: Date | string,
    quietStart: string = '21:30',
    quietEnd: string = '07:30'
): boolean {
    let currentMinutes: number;
    if (typeof currentTime === 'string' && /^\d{2}:\d{2}$/.test(currentTime)) {
        currentMinutes = parseTimeToMinutes(currentTime);
    } else {
        const date = typeof currentTime === 'string' ? new Date(currentTime) : currentTime;
        currentMinutes = date.getHours() * 60 + date.getMinutes();
    }

    const startMinutes = parseTimeToMinutes(quietStart);
    const endMinutes = parseTimeToMinutes(quietEnd);

    if (startMinutes > endMinutes) {
        // Atravessa a meia-noite (ex: 21:30 às 07:30)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
        // No mesmo dia (ex: 01:00 às 06:00)
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
}

/**
 * Motor de Inferência de Hábito de Treino.
 * Para >= 3 treinos, calcula horário mediano (imune a outliers) e dias habituais.
 * Para < 3 treinos, adota cold start (16:30, Seg/Qua/Sex).
 */
export function inferTrainingHabits(
    logs?: WorkoutLogSample[] | null,
    manualPreferredTime?: string | null
): HabitInferenceResult {
    // 1. Horário preferido manual do usuário sempre prevalece
    if (manualPreferredTime && /^\d{2}:\d{2}$/.test(manualPreferredTime)) {
        return {
            habitualDays: [1, 2, 3, 4, 5],
            medianTime: manualPreferredTime,
            confidence: 'high',
            totalWorkouts: logs?.length ?? 0,
            isCustomOverride: true
        };
    }

    // 2. Cold Start (< 3 treinos)
    if (!logs || logs.length < 3) {
        return {
            habitualDays: [1, 3, 5], // Seg, Qua, Sex como baseline esportivo
            medianTime: '16:30',
            confidence: 'cold_start',
            totalWorkouts: logs?.length ?? 0,
            isCustomOverride: false
        };
    }

    // 3. Processar treinos válidos
    const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const minutesList: number[] = [];

    for (const log of logs) {
        if (!log || !log.started_at) continue;
        const date = new Date(log.started_at);
        if (isNaN(date.getTime())) continue;

        const dayOfWeek = date.getDay();
        dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1;

        const minutes = date.getHours() * 60 + date.getMinutes();
        minutesList.push(minutes);
    }

    if (minutesList.length < 3) {
        return {
            habitualDays: [1, 3, 5],
            medianTime: '16:30',
            confidence: 'cold_start',
            totalWorkouts: minutesList.length,
            isCustomOverride: false
        };
    }

    // 4. Calcular Dias Habituais
    // Frequência significativa (>= 20% do volume total ou pelo menos 2 treinos naquele dia)
    const threshold = Math.max(1, Math.round(minutesList.length * 0.20));
    let habitualDays = Object.entries(dayCounts)
        .filter(([_, count]) => count >= threshold)
        .map(([day]) => Number(day))
        .sort((a, b) => a - b);

    // Se a dispersão for muito alta e nenhum dia atingir o threshold, pegar os 3 dias mais frequentes
    if (habitualDays.length === 0) {
        habitualDays = Object.entries(dayCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([day]) => Number(day))
            .sort((a, b) => a - b);
    }

    // 5. Horário Mediano (imune a treinos esporádicos fora do padrão)
    minutesList.sort((a, b) => a - b);
    const midIndex = Math.floor(minutesList.length / 2);
    const medianMinutes = minutesList.length % 2 !== 0
        ? minutesList[midIndex]
        : Math.round((minutesList[midIndex - 1] + minutesList[midIndex]) / 2);

    return {
        habitualDays: habitualDays.length > 0 ? habitualDays : [1, 3, 5],
        medianTime: formatTimeMinutes(medianMinutes),
        confidence: minutesList.length >= 8 ? 'high' : 'medium',
        totalWorkouts: minutesList.length,
        isCustomOverride: false
    };
}

/**
 * Avalia o preenchimento dos dados essenciais de perfil do aluno.
 */
export function checkProfileCompleteness(
    profile?: ProfileSample | null,
    studentData?: StudentDataSample | null
): ProfileCompletenessResult {
    const missingFields: Array<'avatar_url' | 'weight_kg' | 'birth_date' | 'height_cm'> = [];

    // 1. Foto de perfil
    const hasAvatar = Boolean(profile?.avatar_url && profile.avatar_url.trim().length > 0);
    if (!hasAvatar) {
        missingFields.push('avatar_url');
    }

    // 2. Peso corporal
    const hasWeight = typeof studentData?.weight_kg === 'number' && studentData.weight_kg > 0;
    if (!hasWeight) {
        missingFields.push('weight_kg');
    }

    // 3. Data de nascimento ou idade
    const hasBirthDate = Boolean(studentData?.birth_date && studentData.birth_date.trim().length > 0);
    const hasAge = typeof studentData?.age === 'number' && studentData.age > 0;
    if (!hasBirthDate && !hasAge) {
        missingFields.push('birth_date');
    }

    // 4. Altura
    const hasHeight = typeof studentData?.height_cm === 'number' && studentData.height_cm > 0;
    if (!hasHeight) {
        missingFields.push('height_cm');
    }

    const totalFields = 4;
    const completedFields = totalFields - missingFields.length;
    const completionPercentage = Math.round((completedFields / totalFields) * 100);

    return {
        isComplete: missingFields.length === 0,
        missingFields,
        completionPercentage
    };
}

/**
 * Validador dos 4 Escudos Anti-Spam e Políticas de Frequência.
 */
export function evaluateNotificationEligibility(params: EligibilityParams): EligibilityResult {
    const {
        topic,
        currentTime,
        preferences,
        hasTrainedToday,
        todayNotificationsCount,
        weeklyRemindersCount,
        consecutiveIgnoredCount,
        daysSinceLastIgnored,
        isProfileComplete,
        previousOnboardingCount = 0,
        daysSinceLastOnboarding = 0,
        habitualDays
    } = params;

    // 0. Preferência do Usuário (Opt-out global e por tópico)
    if (preferences && preferences.push === false) {
        return { canSend: false, reason: 'TOPIC_DISABLED' };
    }

    if (preferences) {
        if (topic === 'training_reminder' && preferences.reminders === false) {
            return { canSend: false, reason: 'TOPIC_DISABLED' };
        }
        if (topic === 'onboarding_profile' && preferences.profile_completion === false) {
            return { canSend: false, reason: 'TOPIC_DISABLED' };
        }
        if (topic === 'evolution_photos' && preferences.evolution_photos === false) {
            return { canSend: false, reason: 'TOPIC_DISABLED' };
        }
        if (topic === 'plan_expiration' && preferences.plan_expiration === false) {
            return { canSend: false, reason: 'TOPIC_DISABLED' };
        }
    }

    // Regra específica para Onboarding
    if (topic === 'onboarding_profile') {
        if (isProfileComplete) {
            return { canSend: false, reason: 'ONBOARDING_ALREADY_COMPLETED' };
        }
        // Se estiver adiado (snooze de 3 dias), não enviar
        if (preferences?.profile_completion_snoozed_until) {
            const snoozedUntil = new Date(preferences.profile_completion_snoozed_until).getTime();
            if (snoozedUntil > currentTime.getTime()) {
                return { canSend: false, reason: 'BACKOFF_PAUSED' };
            }
        }
        // Máximo de 1 inicial e 1 reforço após 4 dias. Cessar após 2.
        if (previousOnboardingCount >= 2) {
            return { canSend: false, reason: 'ONBOARDING_CAP_REACHED' };
        }
        if (previousOnboardingCount === 1 && daysSinceLastOnboarding < 4) {
            return { canSend: false, reason: 'ONBOARDING_CAP_REACHED' };
        }
    }

    // Escudo 1: Se já treinou hoje, silêncio absoluto para lembretes de treino
    if (topic === 'training_reminder' && hasTrainedToday) {
        return { canSend: false, reason: 'TRAINED_TODAY' };
    }

    // Escudo 2: Teto diário de 1 notificação por dia por aluno
    if (todayNotificationsCount >= 1) {
        return { canSend: false, reason: 'DAILY_CAP_REACHED' };
    }

    // Escudo 2b: Teto semanal de 3 lembretes de treino por semana
    if (topic === 'training_reminder' && weeklyRemindersCount >= 3) {
        return { canSend: false, reason: 'WEEKLY_CAP_REACHED' };
    }

    // Escudo 3: Backoff de 5 dias após 2 lembretes consecutivos ignorados
    if (consecutiveIgnoredCount >= 2 && daysSinceLastIgnored < 5) {
        return { canSend: false, reason: 'BACKOFF_PAUSED' };
    }

    // Escudo 4: Quiet Hours (Silêncio entre 21:30 e 07:30 por padrão)
    const quietStart = preferences?.quiet_hours_start || '21:30';
    const quietEnd = preferences?.quiet_hours_end || '07:30';
    if (isTimeInQuietHours(currentTime, quietStart, quietEnd)) {
        return { canSend: false, reason: 'QUIET_HOURS' };
    }

    // Verificação de Dia Habitual (para training_reminder se dias habituais informados)
    if (topic === 'training_reminder' && Array.isArray(habitualDays) && habitualDays.length > 0) {
        const currentDay = currentTime.getDay();
        if (!habitualDays.includes(currentDay)) {
            return { canSend: false, reason: 'NOT_A_HABITUAL_DAY' };
        }
    }

    return { canSend: true };
}
