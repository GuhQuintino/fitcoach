import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const WORKOUT_COMPLETED_TOPIC = 'workout_completed';
export const WORKOUT_COMPLETED_TITLE = 'Treino Finalizado';
export const DEFAULT_PUSH_ICON = '/icon-gq.png';
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
 * Extrai o primeiro nome (capitalizado) a partir de profiles.full_name (ou email como fallback).
 * Retorna "Seu aluno" se não houver nome utilizável.
 */
export function getFirstName(
  profile: { full_name?: string | null; email?: string | null } | null | undefined
): string {
  const fullNameRaw = (profile?.full_name ?? '').trim();
  if (fullNameRaw) {
    const firstWord = fullNameRaw.split(/\s+/)[0]?.trim();
    if (firstWord) {
      return firstWord.charAt(0).toLocaleUpperCase('pt-BR') + firstWord.slice(1).toLocaleLowerCase('pt-BR');
    }
  }

  const emailRaw = (profile?.email ?? '').trim();
  if (emailRaw) {
    const emailPrefix = emailRaw.split('@')[0]?.trim() ?? '';
    const firstEmailChunk = emailPrefix.split(/[._+-]/)[0]?.trim() ?? '';
    if (firstEmailChunk) {
      return firstEmailChunk.charAt(0).toLocaleUpperCase('pt-BR') + firstEmailChunk.slice(1).toLocaleLowerCase('pt-BR');
    }
  }

  return FALLBACK_STUDENT_NAME;
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
  studentName?: { full_name?: string | null; email?: string | null } | null;
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

/**
 * Comparação em tempo constante via SHA-256 e crypto.timingSafeEqual.
 * Impede vazamento por tempo ou comprimento.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  try {
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    const digestsEqual = crypto.timingSafeEqual(hashA, hashB);
    return digestsEqual && a.length === b.length;
  } catch {
    return false;
  }
}

export interface WebhookRequestBody {
  workout_log_id?: string;
  student_id?: string;
  coach_id?: string;
}

export interface ProcessPushOptions {
  supabaseClient?: any;
  webpushClient?: typeof webpush;
  now?: Date;
}

/**
 * Lógica pura desacoplada do runtime HTTP para facilitar testes unitários e de integração.
 */
export async function processWorkoutCompletedPush(
  body: WebhookRequestBody,
  options?: ProcessPushOptions
) {
  const workoutLogId = body?.workout_log_id;
  if (!workoutLogId) {
    return { status: 400, data: { error: 'workout_log_id is required' } };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contato@gqfit.com.br';

  if (!options?.supabaseClient && (!supabaseUrl || !serviceKey)) {
    return { status: 500, data: { error: 'Missing Supabase server configuration' } };
  }

  const supabase = options?.supabaseClient ?? createClient(supabaseUrl!, serviceKey!, {
    auth: { persistSession: false }
  });

  // 1. Revalidar o log no banco de dados (não confiar cegamente no payload do webhook)
  const { data: log, error: logError } = await supabase
    .from('workout_logs')
    .select('id, student_id, workout_id, started_at, finished_at')
    .eq('id', workoutLogId)
    .maybeSingle();

  if (logError) throw logError;
  if (!log || !isCompletedLog(log)) {
    return { status: 200, data: { success: true, skipped: 'log_not_completed' } };
  }

  // 2. Idempotência: reivindicar o envio (apenas uma execução por treino concluído)
  const dedupeKey = buildDedupeKey(log);
  const now = options?.now ?? new Date();

  const { data: claimed, error: claimError } = await supabase
    .from('workout_completion_notifications')
    .update({ push_sent_at: now.toISOString() })
    .eq('dedupe_key', dedupeKey)
    .is('push_sent_at', null)
    .select('id, coach_id')
    .maybeSingle();

  if (claimError) throw claimError;
  if (!claimed) {
    return { status: 200, data: { success: true, skipped: 'already_notified' } };
  }

  const coachId: string = claimed.coach_id;

  // 3. Buscar profile do aluno e do coach
  const { data: studentProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', log.student_id)
    .maybeSingle();

  const { data: coachProfile } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', coachId)
    .maybeSingle();

  const payload = buildWorkoutCompletedPayload({
    studentId: log.student_id,
    studentName: studentProfile,
  });

  // 4. Avaliar preferências do coach (respeita push desativado, tópico ou silêncio)
  const prefs = coachProfile?.preferences?.notifications ?? {};
  const decision = decideCoachPush(prefs, now);

  if (decision.send === false && decision.reason === 'topic_disabled') {
    return { status: 200, data: { success: true, skipped: decision.reason } };
  }

  // 5. Inserir na central de notificações do coach
  const { data: insertedLog, error: notifError } = await supabase
    .from('notification_logs')
    .insert({
      user_id: coachId,
      topic: WORKOUT_COMPLETED_TOPIC,
      title: payload.title,
      body: payload.body,
      action_url: payload.action_url,
    })
    .select('id')
    .single();

  if (notifError) {
    console.warn('[workout-completed-push] Falha ao registrar notification_logs:', notifError);
  }

  if (decision.send === false) {
    return { status: 200, data: { success: true, skipped: decision.reason } };
  }

  payload.id = insertedLog?.id ?? null;

  // 6. Enviar Web Push para todas as inscrições ativas do coach
  if (!options?.webpushClient && (!vapidPublic || !vapidPrivate)) {
    return { status: 500, data: { error: 'Missing VAPID server configuration' } };
  }

  const wp = options?.webpushClient ?? webpush;
  if (!options?.webpushClient && vapidPublic && vapidPrivate) {
    wp.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  }

  const { data: subscriptions, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', coachId);

  if (subsError) throw subsError;

  let sent = 0;
  let removed = 0;
  const expiredIds: string[] = [];

  for (const sub of (subscriptions ?? []) as PushSubscriptionRow[]) {
    try {
      await wp.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 86400, urgency: 'normal' }
      );
      sent++;
    } catch (err: any) {
      if (isExpiredPushStatus(err?.statusCode)) {
        expiredIds.push(sub.id);
      } else {
        console.warn(`[workout-completed-push] Falha de envio para subscription ${sub.id}:`, err?.statusCode, err?.body ?? err?.message);
      }
    }
  }

  // 7. Limpar assinaturas inválidas (404/410 Gone)
  if (expiredIds.length > 0) {
    const { error: delError } = await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', expiredIds);
    if (!delError) removed = expiredIds.length;
  }

  return { status: 200, data: { success: true, sent, removed } };
}

/**
 * Handler padrão de Serverless Function Vercel (Node.js runtime).
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.WORKOUT_PUSH_WEBHOOK_SECRET ?? '';
  const headerSecret = req.headers?.['x-webhook-secret'] ?? req.headers?.['X-Webhook-Secret'] ?? '';
  const providedSecret = Array.isArray(headerSecret) ? headerSecret[0] : headerSecret;

  if (!webhookSecret || !timingSafeEqual(String(providedSecret), webhookSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const rawBody = req.body;
    const body: WebhookRequestBody = typeof rawBody === 'string' ? JSON.parse(rawBody) : (rawBody || {});

    const result = await processWorkoutCompletedPush(body);
    return res.status(result.status).json(result.data);
  } catch (err: any) {
    console.error('[workout-completed-push] Erro no handler:', err);
    return res.status(500).json({ error: err?.message ?? 'Internal server error' });
  }
}
