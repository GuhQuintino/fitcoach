// Lógica pura (sem dependências de Deno/DOM) do push "Treino Finalizado" para o coach.
// Compartilhada entre a Edge Function `workout-completed-push` e os testes vitest.

export const WORKOUT_COMPLETED_TOPIC = 'workout_completed';
export const WORKOUT_COMPLETED_TITLE = 'Treino Finalizado';
export const DEFAULT_PUSH_ICON = '/icon-192.png';
export const FALLBACK_STUDENT_NAME = 'Seu aluno';

export interface WorkoutLogRecord {
    id: string;
    student_id: string;
    workout_id: string | null;
    started_at: string;
    finished_at: string | null;
}

export interface CoachNotificationPrefs {
    push?: boolean;
    student_workout_completed?: boolean;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
    [key: string]: unknown;
}

export interface WorkoutCompletedPayload {
    title: string;
    body: string;
    icon: string;
    badge: string;
    tag: string;
    topic: string;
    action_url: string;
    id: string | null;
}

export interface PushSubscriptionRow {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
}

/**
 * Extrai o primeiro nome (capitalizado) a partir de profiles.name / profiles.full_name.
 * Retorna "Seu aluno" se não houver nome utilizável.
 */
export function getFirstName(
    profile: { name?: string | null; full_name?: string | null } | null | undefined
): string {
    const raw = (profile?.full_name ?? '').trim() || (profile?.name ?? '').trim();
    if (!raw) return FALLBACK_STUDENT_NAME;

    const firstWord = raw.split(/\s+/)[0];
    if (!firstWord) return FALLBACK_STUDENT_NAME;

    return firstWord.charAt(0).toLocaleUpperCase('pt-BR') + firstWord.slice(1).toLocaleLowerCase('pt-BR');
}

/**
 * Chave de idempotência por treino concluído. Independe do ID do log, pois o sync offline
 * pode apagar (rollback) e recriar o cabeçalho do log com um novo ID para o mesmo treino.
 * IMPORTANTE: manter idêntica à expressão SQL da migration 20261029000000.
 */
export function buildDedupeKey(log: Pick<WorkoutLogRecord, 'student_id' | 'workout_id' | 'started_at'>): string {
    const startedMs = new Date(log.started_at).getTime();
    const startedPart = Number.isNaN(startedMs) ? String(log.started_at) : new Date(startedMs).toISOString();
    return `${log.student_id}|${log.workout_id ?? 'none'}|${startedPart}`;
}

/** Retorna true se o log representa um treino concluído (finished_at preenchido). */
export function isCompletedLog(log: Pick<WorkoutLogRecord, 'finished_at'> | null | undefined): boolean {
    return Boolean(log && log.finished_at);
}

export function buildWorkoutCompletedPayload(params: {
    studentId: string;
    studentName?: { name?: string | null; full_name?: string | null } | null;
    notificationId?: string | null;
}): WorkoutCompletedPayload {
    const firstName = getFirstName(params.studentName);
    return {
        title: WORKOUT_COMPLETED_TITLE,
        body: `${firstName} finalizou o treino!`,
        icon: DEFAULT_PUSH_ICON,
        badge: DEFAULT_PUSH_ICON,
        tag: `fitcoach-${WORKOUT_COMPLETED_TOPIC}-${params.studentId}`,
        topic: WORKOUT_COMPLETED_TOPIC,
        action_url: `/coach/student/${params.studentId}`,
        id: params.notificationId ?? null
    };
}

const parseTimeToMinutes = (value: string | undefined, fallback: number): number => {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return fallback;
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
    return h * 60 + m;
};

/** Minutos desde 00:00 em America/Sao_Paulo (UTC-3). */
export function getBrazilMinutes(date: Date): number {
    const br = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    return br.getUTCHours() * 60 + br.getUTCMinutes();
}

export function isWithinQuietHours(currentMins: number, startStr?: string, endStr?: string): boolean {
    const start = parseTimeToMinutes(startStr || '21:30', 21 * 60 + 30);
    const end = parseTimeToMinutes(endStr || '07:30', 7 * 60 + 30);
    if (start === end) return false;
    if (start > end) return currentMins >= start || currentMins < end;
    return currentMins >= start && currentMins < end;
}

export type PushDecision =
    | { send: true }
    | { send: false; reason: 'push_disabled' | 'topic_disabled' | 'quiet_hours' };

/** Respeita as preferências existentes do coach (push, tópico e horário de silêncio). */
export function decideCoachPush(prefs: CoachNotificationPrefs | null | undefined, now: Date): PushDecision {
    const p = prefs ?? {};
    if (p.push === false) return { send: false, reason: 'push_disabled' };
    if (p.student_workout_completed === false) return { send: false, reason: 'topic_disabled' };
    if (isWithinQuietHours(getBrazilMinutes(now), p.quiet_hours_start, p.quiet_hours_end)) {
        return { send: false, reason: 'quiet_hours' };
    }
    return { send: true };
}

/** Assinaturas expiradas/revogadas que devem ser removidas. */
export function isExpiredPushStatus(statusCode: number | undefined | null): boolean {
    return statusCode === 404 || statusCode === 410;
}
