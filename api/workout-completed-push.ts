import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import {
  WORKOUT_COMPLETED_TOPIC,
  buildDedupeKey,
  buildWorkoutCompletedPayload,
  decideCoachPush,
  isCompletedLog,
  isExpiredPushStatus,
  type PushSubscriptionRow,
} from '../supabase/functions/_shared/workoutCompletedPush.ts';

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
    .select('name, full_name')
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
  const headerSecret = req.headers['x-webhook-secret'] ?? req.headers['X-Webhook-Secret'] ?? '';
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
