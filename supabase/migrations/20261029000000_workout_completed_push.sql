-- =============================================================================
-- Migração: Push "Treino Finalizado" para o coach
-- Data: 2026-10-29
-- NÃO aplicada em produção. Ver supabase/WORKOUT_COMPLETED_PUSH.md para os passos manuais.
--
-- Fluxo: INSERT/UPDATE em workout_logs (finished_at preenchido) -> trigger SECURITY DEFINER
--        -> registra chave de idempotência -> pg_net chama a Edge Function
--        `workout-completed-push`, que envia Web Push ao coach do aluno.
--
-- Cobre todos os caminhos de conclusão (WorkoutExecution, staleWorkoutService e
-- offlineSyncService), pois todos inserem o cabeçalho em workout_logs com finished_at.
-- =============================================================================

-- 1. Extensão para chamadas HTTP assíncronas a partir do banco
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Configuração privada (URL da função e segredo do webhook). Sem policies: só acessível
--    por service_role / funções SECURITY DEFINER.
CREATE TABLE IF NOT EXISTS public.internal_push_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.internal_push_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.internal_push_config FROM anon, authenticated;

-- 3. Tabela de idempotência: uma linha por treino concluído (independe do ID do log, pois o
--    sync offline pode apagar e recriar o cabeçalho do mesmo treino com novo ID).
CREATE TABLE IF NOT EXISTS public.workout_completion_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dedupe_key TEXT NOT NULL,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workout_log_id UUID,
    push_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_workout_completion_notifications_key UNIQUE (dedupe_key)
);
ALTER TABLE public.workout_completion_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workout_completion_notifications FROM anon, authenticated;

-- 4. Função do trigger
CREATE OR REPLACE FUNCTION public.notify_coach_workout_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_coach_id UUID;
    v_key TEXT;
    v_inserted INTEGER;
    v_url TEXT;
    v_secret TEXT;
BEGIN
    -- Somente treinos concluídos (INSERT já finalizado, ou UPDATE que preencheu finished_at)
    IF NEW.finished_at IS NULL THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.finished_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    BEGIN
        SELECT coach_id INTO v_coach_id FROM public.students_data WHERE id = NEW.student_id;
        IF v_coach_id IS NULL THEN
            RETURN NEW;
        END IF;

        -- Config ausente: sair ANTES de gravar o dedupe, para não marcar o treino como notificado
        SELECT value INTO v_url FROM public.internal_push_config WHERE key = 'workout_completed_push_url';
        SELECT value INTO v_secret FROM public.internal_push_config WHERE key = 'workout_completed_push_secret';

        IF v_url IS NULL OR v_secret IS NULL THEN
            RAISE WARNING '[workout-completed-push] internal_push_config sem url/secret; push não enviado';
            RETURN NEW;
        END IF;

        -- Mesma regra de supabase/functions/_shared/workoutCompletedPush.ts (buildDedupeKey)
        v_key := NEW.student_id::text || '|' || COALESCE(NEW.workout_id::text, 'none') || '|' ||
                 to_char(NEW.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

        INSERT INTO public.workout_completion_notifications (dedupe_key, student_id, coach_id, workout_log_id)
        VALUES (v_key, NEW.student_id, v_coach_id, NEW.id)
        ON CONFLICT (dedupe_key) DO NOTHING;
        GET DIAGNOSTICS v_inserted = ROW_COUNT;

        IF v_inserted = 0 THEN
            RETURN NEW; -- já notificado para este treino
        END IF;

        PERFORM net.http_post(
            url := v_url,
            headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
            body := jsonb_build_object('workout_log_id', NEW.id, 'student_id', NEW.student_id, 'coach_id', v_coach_id),
            timeout_milliseconds := 5000
        );
    EXCEPTION WHEN OTHERS THEN
        -- Nunca bloquear a finalização do treino por falha na notificação
        RAISE WARNING '[workout-completed-push] falha ao enfileirar notificação: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_coach_workout_completed() FROM PUBLIC, anon, authenticated;

-- 5. Trigger
DROP TRIGGER IF EXISTS trg_notify_coach_workout_completed ON public.workout_logs;
CREATE TRIGGER trg_notify_coach_workout_completed
    AFTER INSERT OR UPDATE OF finished_at ON public.workout_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_coach_workout_completed();

-- 6. Push subscriptions do coach: já cobertas pela policy "Users can manage their own push
--    subscriptions" (auth.uid() = user_id), válida para qualquer role.
