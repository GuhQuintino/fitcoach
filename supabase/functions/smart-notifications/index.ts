// Supabase Edge Function: smart-notifications
// Executado periodicamente via pg_cron ou webhook agendado
// Serveless Deno Runtime

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const currentDay = now.getDay();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    // Quiet Hours padrão (21:30 às 07:30)
    if (currentTimeInMinutes >= 1290 || currentTimeInMinutes < 450) {
      return new Response(JSON.stringify({ message: "Quiet hours active, skipping reminders" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // 1. Buscar alunos ativos
    const { data: students, error: studentsError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, preferences")
      .eq("role", "student")
      .eq("status", "active");

    if (studentsError) throw studentsError;

    let dispatchedCount = 0;

    for (const student of (students || [])) {
      const studentId = student.id;
      const notifPrefs = student.preferences?.notifications || {};

      // Se o aluno desativou push ou lembretes
      if (notifPrefs.push === false || notifPrefs.reminders === false) continue;

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

      // Buscar histórico dos últimos 28 dias para inferência de hábitos
      const past28Days = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();
      const { data: pastLogs } = await supabase
        .from("workout_logs")
        .select("started_at")
        .eq("student_id", studentId)
        .gte("started_at", past28Days)
        .order("started_at", { ascending: false });

      // Calcular hábito
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
          const day = d.getDay();
          daysMap[day] = (daysMap[day] || 0) + 1;
          minutesArr.push(d.getHours() * 60 + d.getMinutes());
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

      await supabase.from("notification_logs").insert({
        user_id: studentId,
        topic: "training_reminder",
        title: "Hora do treino de hoje! 🏋️",
        body: `Seu horário habitual de treino é por volta das ${formattedTime}. Seu treino já está preparado no app!`,
        action_url: "/student/dashboard"
      });

      dispatchedCount++;
    }

    return new Response(JSON.stringify({ success: true, dispatched: dispatchedCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
