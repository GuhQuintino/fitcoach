-- =============================================================================
-- Migração: Push Subscriptions & Smart Notifications Engine
-- Data: 2026-10-25
-- =============================================================================

-- 1. Tabela de Inscrições Push (Dispositivos dos Usuários)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint)
);

-- Índices para busca rápida de inscrições por usuário
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
    ON public.push_subscriptions(user_id);

-- 2. Tabela de Histórico e Central de Notificações
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL, -- 'training_reminder', 'onboarding_profile', 'evolution_photos', 'plan_expiration', 'coach_feedback', 'system'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT DEFAULT '/student/dashboard' NOT NULL,
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices de Alta Performance:
-- A) Índice Parcial para contagem instantânea de não lidas e exibição do sino
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_unread 
    ON public.notification_logs (user_id, created_at DESC) 
    WHERE read_at IS NULL;

-- B) Índice Composto para Frequency Capping, Backoff e verificação de envio recente
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_topic_created 
    ON public.notification_logs (user_id, topic, created_at DESC);

-- C) Índice para listagem geral paginada da central de notificações
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_created 
    ON public.notification_logs (user_id, created_at DESC);

-- 3. Assegurar coluna 'preferences' em public.profiles com valores padrão
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
        "focusMode": false,
        "notifications": {
            "push": true,
            "email": false,
            "reminders": true,
            "evolution_photos": true,
            "plan_expiration": true,
            "quiet_hours_start": "21:30",
            "quiet_hours_end": "07:30",
            "preferred_training_time": null
        }
    }'::jsonb;

-- 4. Habilitar RLS em ambas as tabelas
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 5. Conceder permissões para os roles da API REST Supabase
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_logs TO authenticated;

-- 6. Políticas RLS para public.push_subscriptions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_subscriptions' 
        AND policyname = 'Users can manage their own push subscriptions'
    ) THEN
        CREATE POLICY "Users can manage their own push subscriptions"
            ON public.push_subscriptions
            FOR ALL
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 7. Políticas RLS para public.notification_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_logs' 
        AND policyname = 'Users can view their own notifications'
    ) THEN
        CREATE POLICY "Users can view their own notifications"
            ON public.notification_logs
            FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_logs' 
        AND policyname = 'Users can update their own notifications read and clicked status'
    ) THEN
        CREATE POLICY "Users can update their own notifications read and clicked status"
            ON public.notification_logs
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_logs' 
        AND policyname = 'Users can insert their own notifications'
    ) THEN
        CREATE POLICY "Users can insert their own notifications"
            ON public.notification_logs
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
