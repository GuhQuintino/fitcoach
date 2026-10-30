// Supabase Edge Function: workout-completed-push
// Disparada pelo trigger de banco `trg_notify_coach_workout_completed` (via pg_net) quando
// um aluno conclui um treino (inclusive via sync offline). Envia Web Push (VAPID) ao coach.
//
// Deploy: supabase functions deploy workout-completed-push --no-verify-jwt
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, WORKOUT_PUSH_WEBHOOK_SECRET

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import webpush from "npm:web-push@3.6.7";
import {
  WORKOUT_COMPLETED_TOPIC,
  buildDedupeKey,
  buildWorkoutCompletedPayload,
  decideCoachPush,
  isCompletedLog,
  isExpiredPushStatus,
  type PushSubscriptionRow,
} from "../_shared/workoutCompletedPush.ts";
import { timingSafeEqual } from "../_shared/timingSafeEqual.ts";

const jsonHeaders = { "Content-Type": "application/json" };

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const webhookSecret = Deno.env.get("WORKOUT_PUSH_WEBHOOK_SECRET") ?? "";
  const providedSecret = req.headers.get("x-webhook-secret") ?? "";
  if (!webhookSecret || !(await timingSafeEqual(providedSecret, webhookSecret))) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@fitcoach.app";

    if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
      return jsonResponse({ error: "Missing server configuration" }, 500);
    }

    const body = await req.json().catch(() => null);
    const workoutLogId: string | undefined = body?.workout_log_id;
    if (!workoutLogId) {
      return jsonResponse({ error: "workout_log_id is required" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    // 1. Revalidar o log no banco (não confiar cegamente no payload do webhook)
    const { data: log, error: logError } = await supabase
      .from("workout_logs")
      .select("id, student_id, workout_id, started_at, finished_at")
      .eq("id", workoutLogId)
      .maybeSingle();

    if (logError) throw logError;
    if (!log || !isCompletedLog(log)) {
      return jsonResponse({ success: true, skipped: "log_not_completed" });
    }

    // 2. Idempotência: reivindicar o envio (apenas uma execução por treino concluído)
    const dedupeKey = buildDedupeKey(log);
    const { data: claimed, error: claimError } = await supabase
      .from("workout_completion_notifications")
      .update({ push_sent_at: new Date().toISOString() })
      .eq("dedupe_key", dedupeKey)
      .is("push_sent_at", null)
      .select("id, coach_id")
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed) {
      return jsonResponse({ success: true, skipped: "already_notified" });
    }

    const coachId: string = claimed.coach_id;

    // 3. Dados do aluno e preferências do coach
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", log.student_id)
      .maybeSingle();

    const { data: coachProfile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", coachId)
      .maybeSingle();

    const payload = buildWorkoutCompletedPayload({
      studentId: log.student_id,
      studentName: studentProfile,
    });

    // 4. Registrar na central de notificações do coach (respeita o tópico desativado)
    const prefs = coachProfile?.preferences?.notifications ?? {};
    const decision = decideCoachPush(prefs, new Date());

    if (!decision.send && decision.reason === "topic_disabled") {
      return jsonResponse({ success: true, skipped: decision.reason });
    }

    const { data: insertedLog } = await supabase
      .from("notification_logs")
      .insert({
        user_id: coachId,
        topic: WORKOUT_COMPLETED_TOPIC,
        title: payload.title,
        body: payload.body,
        action_url: payload.action_url,
      })
      .select("id")
      .single();

    if (!decision.send) {
      return jsonResponse({ success: true, skipped: decision.reason });
    }

    payload.id = insertedLog?.id ?? null;

    // 5. Enviar para todas as assinaturas do coach; remover as expiradas (404/410)
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", coachId);

    if (subsError) throw subsError;

    let sent = 0;
    let removed = 0;
    const expiredIds: string[] = [];

    for (const sub of (subscriptions ?? []) as PushSubscriptionRow[]) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 86400, urgency: "normal" },
        );
        sent++;
      } catch (err: any) {
        if (isExpiredPushStatus(err?.statusCode)) {
          expiredIds.push(sub.id);
        } else {
          console.warn(`[workout-completed-push] Falha ao enviar para ${sub.id}:`, err?.statusCode, err?.body ?? err?.message);
        }
      }
    }

    if (expiredIds.length > 0) {
      const { error: delError } = await supabase.from("push_subscriptions").delete().in("id", expiredIds);
      if (!delError) removed = expiredIds.length;
    }

    return jsonResponse({ success: true, sent, removed });
  } catch (err: any) {
    console.error("[workout-completed-push] Erro:", err);
    return jsonResponse({ error: err?.message ?? "Internal error" }, 500);
  }
});
