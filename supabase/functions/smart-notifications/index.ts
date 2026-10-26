// Supabase Edge Function: smart-notifications
// Executado periodicamente via pg_cron ou webhook agendado
// Serverless Deno Runtime

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const parseTimeToMinutes = (timeStr: string, fallbackMinutes: number): number => {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return fallbackMinutes;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return fallbackMinutes;
  return h * 60 + m;
};

const isWithinQuietHours = (currentMins: number, startStr?: string, endStr?: string): boolean => {
  const startMins = parseTimeToMinutes(startStr || "21:30", 21 * 60 + 30);
  const endMins = parseTimeToMinutes(endStr || "07:30", 7 * 60 + 30);

  if (startMins === endMins) return false;
  // Faixa noturna cruzando meia-noite (ex: 21:30 -> 07:30)
  if (startMins > endMins) {
    return currentMins >= startMins || currentMins < endMins;
  }
  // Faixa diurna no mesmo dia (ex: 01:00 -> 06:00)
  return currentMins >= startMins && currentMins < endMins;
};

const getBrazilDateParts = (date: Date) => {
  // America/Sao_Paulo (UTC-3)
  const brTimeMs = date.getTime() - 3 * 60 * 60 * 1000;
  const brDate = new Date(brTimeMs);
  const year = brDate.getUTCFullYear();
  const month = brDate.getUTCMonth();
  const dayOfMonth = brDate.getUTCDate();
  const dayOfWeek = brDate.getUTCDay();
  const hours = brDate.getUTCHours();
  const minutes = brDate.getUTCMinutes();
  // Início do dia em America/Sao_Paulo convertido para UTC ISO
  const startOfTodayUtc = new Date(Date.UTC(year, month, dayOfMonth, 3, 0, 0)).toISOString();

  return {
    dayOfWeek,
    hours,
    minutes,
    currentTimeInMinutes: hours * 60 + minutes,
    startOfTodayUtc
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase service credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const {
      dayOfWeek: currentDay,
      currentTimeInMinutes,
      startOfTodayUtc: startOfToday
    } = getBrazilDateParts(now);

    // 1. Buscar alunos ativos
    const { data: students, error: studentsError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, preferences")
      .eq("role", "student")
      .eq("status", "active");

    if (studentsError) throw studentsError;

    let dispatchedCount = 0;
    let webPushSentCount = 0;

    for (const student of (students || [])) {
      const studentId = student.id;
      const notifPrefs = student.preferences?.notifications || {};

      // Se o aluno desativou push ou lembretes
      if (notifPrefs.push === false || notifPrefs.reminders === false) continue;

      // Escudo 0: Respeitar Quiet Hours customizado por aluno (fuso America/Sao_Paulo)
      if (isWithinQuietHours(currentTimeInMinutes, notifPrefs.quiet_hours_start, notifPrefs.quiet_hours_end)) {
        continue;
      }

      // Escudo 1: Verificar se já treinou hoje
      const { data: todayLogs } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("student_id", studentId)
        .gte("started_at", startOfToday)
        .limit(1);

      if (todayLogs && todayLogs.length > 0) continue;

      // Escudo 2: Verificar teto diário (máx 1 notificação por dia)
      const { data: todayNotifs } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("user_id", studentId)
        .gte("created_at", startOfToday)
        .limit(1);

      if (todayNotifs && todayNotifs.length > 0) continue;

      // Escudo 2b: Teto semanal (máx 3 lembretes de treino na semana)
      const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: weeklyRemindersCount } = await supabase
        .from("notification_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", studentId)
        .eq("topic", "training_reminder")
        .gte("created_at", past7Days);

      if ((weeklyRemindersCount ?? 0) >= 3) continue;

      // Escudo 2c: Backoff Inteligente de 5 dias (se ignorou >= 2 notificações seguidas recentemente)
      const { data: recentNotifs } = await supabase
        .from("notification_logs")
        .select("id, created_at, read_at, clicked_at")
        .eq("user_id", studentId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentNotifs && recentNotifs.length >= 2) {
        let consecutiveIgnored = 0;
        for (const n of recentNotifs) {
          if (!n.read_at && !n.clicked_at) {
            consecutiveIgnored++;
          } else {
            break;
          }
        }
        if (consecutiveIgnored >= 2) {
          const lastIgnoredDate = new Date(recentNotifs[0].created_at);
          const daysSinceLastIgnored = Math.floor(
            (now.getTime() - lastIgnoredDate.getTime()) / (24 * 60 * 60 * 1000)
          );
          if (daysSinceLastIgnored < 5) {
            continue;
          }
        }
      }

      // Buscar histórico dos últimos 28 dias para inferência de hábitos
      const past28Days = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();
      const { data: pastLogs } = await supabase
        .from("workout_logs")
        .select("started_at")
        .eq("student_id", studentId)
        .gte("started_at", past28Days)
        .order("started_at", { ascending: false });

      // Calcular hábito no fuso do Brasil (UTC-3)
      let targetTimeMinutes = 990; // 16:30 padrão Cold Start
      let habitualDays = [1, 3, 5]; // Seg, Qua, Sex

      if (notifPrefs.preferred_training_time && /^\d{2}:\d{2}$/.test(notifPrefs.preferred_training_time)) {
        const [h, m] = notifPrefs.preferred_training_time.split(":").map(Number);
        targetTimeMinutes = h * 60 + m;
        habitualDays = [1, 2, 3, 4, 5];
      } else if (pastLogs && pastLogs.length >= 3) {
        const minutesArr: number[] = [];
        const daysMap: Record<number, number> = {};

        for (const log of pastLogs) {
          const d = new Date(log.started_at);
          if (isNaN(d.getTime())) continue;
          const parts = getBrazilDateParts(d);
          daysMap[parts.dayOfWeek] = (daysMap[parts.dayOfWeek] || 0) + 1;
          minutesArr.push(parts.currentTimeInMinutes);
        }

        if (minutesArr.length >= 3) {
          minutesArr.sort((a, b) => a - b);
          targetTimeMinutes = minutesArr[Math.floor(minutesArr.length / 2)];
          const threshold = Math.max(1, Math.round(minutesArr.length * 0.20));
          habitualDays = Object.entries(daysMap)
            .filter(([_, cnt]) => cnt >= threshold)
            .map(([d]) => Number(d));
        }
      }

      // Se hoje não for dia habitual do aluno
      if (!habitualDays.includes(currentDay)) continue;

      // Se a hora atual ainda estiver muito antes do horário de treino (disparar na janela de até 20 min antes)
      if (currentTimeInMinutes < targetTimeMinutes - 20) continue;

      // Disparar notificação
      const targetHoursStr = String(Math.floor(targetTimeMinutes / 60)).padStart(2, "0");
      const targetMinsStr = String(targetTimeMinutes % 60).padStart(2, "0");
      const formattedTime = `${targetHoursStr}:${targetMinsStr}`;

      const notifTitle = "Hora do treino de hoje! 🏋️";
      const notifBody = `Seu horário habitual de treino é por volta das ${formattedTime}. Seu treino já está preparado no app!`;
      const actionUrl = "/student/dashboard";

      const { data: insertedLog } = await supabase
        .from("notification_logs")
        .insert({
          user_id: studentId,
          topic: "training_reminder",
          title: notifTitle,
          body: notifBody,
          action_url: actionUrl
        })
        .select("id")
        .single();

      // Buscar assinaturas Web Push ativas do aluno em push_subscriptions
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", studentId);

      if (subscriptions && subscriptions.length > 0) {
        const pushPayload = JSON.stringify({
          title: notifTitle,
          body: notifBody,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "fitcoach-training_reminder",
          data: {
            url: actionUrl,
            notificationId: insertedLog?.id ?? null,
            topic: "training_reminder"
          }
        });

        for (const sub of subscriptions) {
          if (!sub.endpoint) continue;
          try {
            const pushRes = await fetch(sub.endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "TTL": "86400"
              },
              body: pushPayload
            });

            if (pushRes.status === 404 || pushRes.status === 410) {
              // Remove assinatura expirada ou revogada
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            } else if (pushRes.ok) {
              webPushSentCount++;
            }
          } catch (pushErr) {
            console.warn(`[smart-notifications] Falha ao enviar push para ${sub.id}:`, pushErr);
          }
        }
      }

      dispatchedCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        dispatched: dispatchedCount,
        webPushSent: webPushSentCount
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
