export type NotificationTopic = 
    | 'training_reminder'
    | 'onboarding_profile'
    | 'evolution_photos'
    | 'plan_expiration'
    | 'coach_feedback'
    | 'system';

export interface PushSubscriptionKeys {
    p256dh: string;
    auth: string;
}

export interface PushSubscriptionData {
    endpoint: string;
    keys: PushSubscriptionKeys;
}

export interface PushSubscriptionRecord {
    id: string;
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent: string | null;
    created_at: string;
    updated_at: string;
}

export interface NotificationLog {
    id: string;
    user_id: string;
    topic: NotificationTopic;
    title: string;
    body: string;
    action_url: string;
    read_at: string | null;
    clicked_at: string | null;
    created_at: string;
}

export interface NotificationPreferences {
    push: boolean;
    email: boolean;
    reminders: boolean;           // Lembretes de treino
    profile_completion?: boolean; // Lembrete na dashboard para completar perfil
    profile_completion_snoozed_until?: string | null; // ISO timestamp até quando está adiado (3 dias)
    evolution_photos: boolean;    // Fotos de evolução (aluno) / Feedbacks (coach)
    plan_expiration: boolean;     // Aviso de plano (aluno) / Alunos expirados (coach)
    system_updates?: boolean;     // Atualizações do sistema
    quiet_hours_start: string;    // Padrão: "21:30"
    quiet_hours_end: string;      // Padrão: "07:30"
    preferred_training_time: string | null; // Se aluno fixar manualmente (ex: "18:00")
}

export interface HabitInferenceResult {
    habitualDays: number[]; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    medianTime: string;     // Formato "HH:mm" (ex: "18:30")
    confidence: 'high' | 'medium' | 'cold_start';
    totalWorkouts: number;
    isCustomOverride: boolean;
}

export interface ProfileCompletenessResult {
    isComplete: boolean;
    missingFields: Array<'avatar_url' | 'weight_kg' | 'birth_date' | 'height_cm'>;
    completionPercentage: number;
}

export type IneligibilityReason = 
    | 'TRAINED_TODAY'
    | 'DAILY_CAP_REACHED'
    | 'WEEKLY_CAP_REACHED'
    | 'BACKOFF_PAUSED'
    | 'QUIET_HOURS'
    | 'TOPIC_DISABLED'
    | 'ONBOARDING_ALREADY_COMPLETED'
    | 'ONBOARDING_CAP_REACHED'
    | 'NOT_A_HABITUAL_DAY'
    | 'TOO_EARLY_FOR_REMINDER';

export interface EligibilityParams {
    userId: string;
    topic: NotificationTopic;
    currentTime: Date;
    preferences: NotificationPreferences;
    hasTrainedToday: boolean;
    todayNotificationsCount: number;
    weeklyRemindersCount: number;
    consecutiveIgnoredCount: number;
    daysSinceLastIgnored: number;
    // Onboarding specific
    isProfileComplete?: boolean;
    previousOnboardingCount?: number;
    daysSinceLastOnboarding?: number;
    // Habit specific
    habitualDays?: number[];
    medianTime?: string;
}

export interface EligibilityResult {
    canSend: boolean;
    reason?: IneligibilityReason;
}
