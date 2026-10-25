import { supabase } from '../lib/supabaseClient';
import {
    NotificationLog,
    NotificationPreferences,
    NotificationTopic
} from '../types/notifications';
import {
    inferTrainingHabits,
    checkProfileCompleteness,
    evaluateNotificationEligibility,
    parseTimeToMinutes
} from './workoutHabitAnalyzer';

export interface StudentNotificationContext {
    userId: string;
    preferences: NotificationPreferences;
    hasTrainedToday: boolean;
    todayNotificationsCount: number;
    weeklyRemindersCount: number;
    consecutiveIgnoredCount: number;
    daysSinceLastIgnored: number;
    isProfileComplete: boolean;
    missingFields: string[];
    previousOnboardingCount: number;
    daysSinceLastOnboarding: number;
    habitualDays: number[];
    medianTime: string;
    confidence: string;
}

/**
 * Busca o total de notificações não lidas para o usuário logado.
 */
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
    if (!userId) return 0;
    try {
        const { count, error } = await supabase
            .from('notification_logs')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('read_at', null);

        if (error) {
            console.warn('[Dispatcher] Erro ao buscar contagem de não lidas:', error);
            return 0;
        }
        return count ?? 0;
    } catch {
        return 0;
    }
}

/**
 * Busca a lista recente de notificações do usuário.
 */
export async function getRecentNotifications(
    userId: string,
    limit: number = 20
): Promise<NotificationLog[]> {
    if (!userId) return [];
    try {
        const { data, error } = await supabase
            .from('notification_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.warn('[Dispatcher] Erro ao buscar histórico de notificações:', error);
            return [];
        }
        return (data as NotificationLog[]) || [];
    } catch {
        return [];
    }
}

/**
 * Marca uma notificação individual como lida.
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
    if (!notificationId) return false;
    try {
        const { error } = await supabase
            .from('notification_logs')
            .update({ read_at: new Date().toISOString() })
            .eq('id', notificationId);

        return !error;
    } catch {
        return false;
    }
}

/**
 * Marca todas as notificações não lidas do usuário como lidas.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
        const { error } = await supabase
            .from('notification_logs')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .is('read_at', null);

        return !error;
    } catch {
        return false;
    }
}

/**
 * Registra uma nova notificação em notification_logs.
 */
export async function createNotificationLog(
    userId: string,
    topic: NotificationTopic,
    title: string,
    body: string,
    actionUrl: string = '/student/dashboard'
): Promise<NotificationLog | null> {
    try {
        const { data, error } = await supabase
            .from('notification_logs')
            .insert({
                user_id: userId,
                topic,
                title,
                body,
                action_url: actionUrl
            })
            .select()
            .single();

        if (error) {
            console.error('[Dispatcher] Erro ao criar log de notificação:', error);
            return null;
        }

        // Se o Service Worker estiver pronto e tiver permissão, exibir notificação nativa no cliente
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                try {
                    const reg = await navigator.serviceWorker.ready;
                    await reg.showNotification(title, {
                        body,
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        tag: `fitcoach-${topic}`,
                        data: { url: actionUrl, notificationId: data?.id, topic }
                    });
                } catch {
                    // Ignora falha de display nativo local
                }
            }
        }

        return data as NotificationLog;
    } catch (err) {
        console.error('[Dispatcher] Falha ao despachar notificação:', err);
        return null;
    }
}

/**
 * Coleta todo o contexto estatístico do aluno para inferência de hábitos e escudos anti-spam.
 */
export async function fetchStudentNotificationContext(
    userId: string
): Promise<StudentNotificationContext | null> {
    if (!userId) return null;

    try {
        const now = new Date();
        const past28Days = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Perfil e Preferências
        const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url, preferences')
            .eq('id', userId)
            .single();

        // 2. Dados do Aluno (peso, data nascimento, idade, altura)
        const { data: studentData } = await supabase
            .from('students_data')
            .select('weight_kg, birth_date, age, height_cm')
            .eq('id', userId)
            .single();

        // 3. Workout logs dos últimos 28 dias
        const { data: workoutLogs } = await supabase
            .from('workout_logs')
            .select('id, started_at, completed_at')
            .eq('student_id', userId)
            .gte('started_at', past28Days)
            .order('started_at', { ascending: false });

        // 4. Notification logs dos últimos 7 dias
        const { data: recentNotifications } = await supabase
            .from('notification_logs')
            .select('id, topic, created_at, read_at, clicked_at')
            .eq('user_id', userId)
            .gte('created_at', past7Days)
            .order('created_at', { ascending: false });

        // Normalização de preferências
        const rawPrefs = profile?.preferences?.notifications || {};
        const preferences: NotificationPreferences = {
            push: rawPrefs.push ?? true,
            email: rawPrefs.email ?? false,
            reminders: rawPrefs.reminders ?? true,
            evolution_photos: rawPrefs.evolution_photos ?? true,
            plan_expiration: rawPrefs.plan_expiration ?? true,
            quiet_hours_start: rawPrefs.quiet_hours_start || '21:30',
            quiet_hours_end: rawPrefs.quiet_hours_end || '07:30',
            preferred_training_time: rawPrefs.preferred_training_time || null
        };

        // Cálculos de Treino
        const logs = workoutLogs || [];
        const hasTrainedToday = logs.some(l => l.started_at >= startOfToday);

        // Inferência de Hábitos
        const habit = inferTrainingHabits(logs, preferences.preferred_training_time);

        // Completude de Perfil
        const completeness = checkProfileCompleteness(profile, studentData);

        // Estatísticas de Notificações
        const notifications = recentNotifications || [];
        const todayNotifications = notifications.filter(n => n.created_at >= startOfToday);
        const todayNotificationsCount = todayNotifications.length;

        const weeklyReminders = notifications.filter(n => n.topic === 'training_reminder');
        const weeklyRemindersCount = weeklyReminders.length;

        // Análise de Ignorados (para Backoff)
        // Conta notificações consecutivas onde read_at e clicked_at são nulos
        let consecutiveIgnoredCount = 0;
        for (const notif of notifications) {
            if (!notif.read_at && !notif.clicked_at) {
                consecutiveIgnoredCount++;
            } else {
                break;
            }
        }

        const lastIgnored = notifications.find(n => !n.read_at && !n.clicked_at);
        const daysSinceLastIgnored = lastIgnored
            ? Math.floor((now.getTime() - new Date(lastIgnored.created_at).getTime()) / (24 * 60 * 60 * 1000))
            : 999;

        // Análise de Onboarding
        const onboardingNotifs = notifications.filter(n => n.topic === 'onboarding_profile');
        const previousOnboardingCount = onboardingNotifs.length;
        const lastOnboarding = onboardingNotifs[0];
        const daysSinceLastOnboarding = lastOnboarding
            ? Math.floor((now.getTime() - new Date(lastOnboarding.created_at).getTime()) / (24 * 60 * 60 * 1000))
            : 999;

        return {
            userId,
            preferences,
            hasTrainedToday,
            todayNotificationsCount,
            weeklyRemindersCount,
            consecutiveIgnoredCount,
            daysSinceLastIgnored,
            isProfileComplete: completeness.isComplete,
            missingFields: completeness.missingFields,
            previousOnboardingCount,
            daysSinceLastOnboarding,
            habitualDays: habit.habitualDays,
            medianTime: habit.medianTime,
            confidence: habit.confidence
        };
    } catch (err) {
        console.warn('[Dispatcher] Falha ao coletar contexto:', err);
        return null;
    }
}

/**
 * Avalia de ponta a ponta e despacha notificações inteligentes pertinentes para o aluno.
 * Chamado automaticamente na inicialização da Dashboard do aluno.
 */
export async function runStudentSmartNotificationCheck(userId: string): Promise<{ dispatched: boolean; topic?: string; reason?: string }> {
    if (!userId) return { dispatched: false, reason: 'NO_USER' };

    const context = await fetchStudentNotificationContext(userId);
    if (!context) return { dispatched: false, reason: 'CONTEXT_FAILED' };

    const now = new Date();

    // 1. Checagem de Onboarding (Perfil Incompleto)
    if (!context.isProfileComplete) {
        const onboardingEligibility = evaluateNotificationEligibility({
            userId,
            topic: 'onboarding_profile',
            currentTime: now,
            preferences: context.preferences,
            hasTrainedToday: context.hasTrainedToday,
            todayNotificationsCount: context.todayNotificationsCount,
            weeklyRemindersCount: context.weeklyRemindersCount,
            consecutiveIgnoredCount: context.consecutiveIgnoredCount,
            daysSinceLastIgnored: context.daysSinceLastIgnored,
            isProfileComplete: false,
            previousOnboardingCount: context.previousOnboardingCount,
            daysSinceLastOnboarding: context.daysSinceLastOnboarding
        });

        if (onboardingEligibility.canSend) {
            await createNotificationLog(
                userId,
                'onboarding_profile',
                'Complete seu perfil de treino 💪',
                'Adicione sua foto, peso e dados corporais para que seu treinador possa calibrar suas cargas com precisão.',
                '/student/profile'
            );
            return { dispatched: true, topic: 'onboarding_profile' };
        }
    }

    // 2. Checagem de Lembrete de Treino Inteligente
    const reminderEligibility = evaluateNotificationEligibility({
        userId,
        topic: 'training_reminder',
        currentTime: now,
        preferences: context.preferences,
        hasTrainedToday: context.hasTrainedToday,
        todayNotificationsCount: context.todayNotificationsCount,
        weeklyRemindersCount: context.weeklyRemindersCount,
        consecutiveIgnoredCount: context.consecutiveIgnoredCount,
        daysSinceLastIgnored: context.daysSinceLastIgnored,
        habitualDays: context.habitualDays
    });

    if (reminderEligibility.canSend) {
        // Verifica se o horário atual está próximo ou posterior ao horário mediano (janela de até 3 horas pós-horário)
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const medianMinutes = parseTimeToMinutes(context.medianTime);

        // Se já passou pelo menos do horário mediano (ou faltam menos de 15 minutos para ele)
        if (currentMinutes >= medianMinutes - 15) {
            await createNotificationLog(
                userId,
                'training_reminder',
                'Hora do treino de hoje! 🏋️',
                `Seu horário habitual de treino é por volta das ${context.medianTime}. Seu treino já está preparado no app!`,
                '/student/dashboard'
            );
            return { dispatched: true, topic: 'training_reminder' };
        }
    }

    return { dispatched: false, reason: reminderEligibility.reason || 'NOT_TIME_YET' };
}
