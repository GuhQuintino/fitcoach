-- Migration: 20261012000000_special_sets_and_intensification.sql
-- Description: Suporte a Séries Especiais, Métodos de Intensificação e Agrupamento (Biset/Triset)

-- 0. Expansão do enum set_type
DO $$
BEGIN
    ALTER TYPE set_type ADD VALUE IF NOT EXISTS 'backoff';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;

-- 1. Tabela exercise_groups
CREATE TABLE IF NOT EXISTS public.exercise_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
    group_type TEXT NOT NULL DEFAULT 'superset',
    group_order INTEGER NOT NULL,
    rest_seconds INTEGER DEFAULT 90,
    rounds INTEGER DEFAULT 3,
    transition_seconds INTEGER DEFAULT 0,
    coach_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT exercise_groups_type_check 
        CHECK (group_type IN ('superset', 'triset', 'giant_set', 'paired_antagonist'))
);

CREATE INDEX IF NOT EXISTS idx_exercise_groups_workout 
    ON public.exercise_groups(workout_id, group_order);

-- 2. Alterações em workout_items
ALTER TABLE public.workout_items
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.exercise_groups(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS group_position INTEGER;

CREATE INDEX IF NOT EXISTS idx_workout_items_group 
    ON public.workout_items(group_id, group_position);

-- 3. Alterações em workout_sets
-- Novas colunas das 4 camadas ortogonais
ALTER TABLE public.workout_sets
    ADD COLUMN IF NOT EXISTS set_method TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS micro_rest_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS tempo TEXT,
    ADD COLUMN IF NOT EXISTS timer_mode TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS drop_count INTEGER,
    ADD COLUMN IF NOT EXISTS sub_sets INTEGER,
    ADD COLUMN IF NOT EXISTS activation_reps INTEGER;

-- Constraints de integridade para workout_sets
ALTER TABLE public.workout_sets DROP CONSTRAINT IF EXISTS workout_sets_method_check;
ALTER TABLE public.workout_sets
    ADD CONSTRAINT workout_sets_method_check
    CHECK (set_method IN (
        'standard', 'dropset', 'rest_pause', 'cluster',
        'myo_reps', 'muscle_round', 'method_3_7', 'fst7', 'bfr'
    ));

ALTER TABLE public.workout_sets DROP CONSTRAINT IF EXISTS workout_sets_execution_check;
ALTER TABLE public.workout_sets
    ADD CONSTRAINT workout_sets_execution_check
    CHECK (execution_mode IN (
        'standard', 'tempo', 'pause_reps', 'deadstop', 'ponto_zero',
        'lengthened_partial', 'twenty_ones', 'one_and_half',
        'negative', 'forced_reps'
    ));

ALTER TABLE public.workout_sets DROP CONSTRAINT IF EXISTS workout_sets_timer_check;
ALTER TABLE public.workout_sets
    ADD CONSTRAINT workout_sets_timer_check
    CHECK (timer_mode IN ('standard', 'emom', 'amrap', 'tabata'));

-- 4. Alterações em set_logs
ALTER TABLE public.set_logs
    ADD COLUMN IF NOT EXISTS group_round INTEGER,
    ADD COLUMN IF NOT EXISTS set_method TEXT,
    ADD COLUMN IF NOT EXISTS micro_set_index INTEGER,
    ADD COLUMN IF NOT EXISTS execution_mode TEXT,
    ADD COLUMN IF NOT EXISTS tempo_used TEXT,
    ADD COLUMN IF NOT EXISTS timer_mode TEXT;

CREATE INDEX IF NOT EXISTS idx_set_logs_group_round 
    ON public.set_logs(workout_log_id, exercise_id, group_round);

-- 5. Row Level Security (RLS) para exercise_groups
ALTER TABLE public.exercise_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach manage exercise groups" ON public.exercise_groups;
CREATE POLICY "Coach manage exercise groups" ON public.exercise_groups
FOR ALL TO authenticated
USING (
    workout_id IN (
        SELECT w.id FROM public.workouts w
        JOIN public.routines r ON w.routine_id = r.id
        WHERE r.coach_id = auth.uid()
    )
)
WITH CHECK (
    workout_id IN (
        SELECT w.id FROM public.workouts w
        JOIN public.routines r ON w.routine_id = r.id
        WHERE r.coach_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Student read exercise groups" ON public.exercise_groups;
CREATE POLICY "Student read exercise groups" ON public.exercise_groups
FOR SELECT TO authenticated
USING (
    workout_id IN (
        SELECT w.id FROM public.workouts w
        JOIN public.routines r ON w.routine_id = r.id
        JOIN public.student_assignments sa ON sa.routine_id = r.id
        WHERE sa.student_id = auth.uid() AND sa.is_active = true
    )
);
