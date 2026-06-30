-- 1. Add columns to exercises table
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS muscle_weights JSONB DEFAULT '{}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'reps' NOT NULL;

-- Add check constraint for exercise_type
ALTER TABLE public.exercises
DROP CONSTRAINT IF EXISTS exercises_exercise_type_check;

ALTER TABLE public.exercises
ADD CONSTRAINT exercises_exercise_type_check 
CHECK (exercise_type IN ('reps', 'time', 'cardio'));

-- 2. Add columns to workout_sets table (prescription targets)
ALTER TABLE public.workout_sets
ADD COLUMN IF NOT EXISTS time_target INTEGER,
ADD COLUMN IF NOT EXISTS distance_target NUMERIC,
ADD COLUMN IF NOT EXISTS speed_target NUMERIC,
ADD COLUMN IF NOT EXISTS hiit_work_seconds INTEGER,
ADD COLUMN IF NOT EXISTS hiit_rest_seconds INTEGER,
ADD COLUMN IF NOT EXISTS hiit_work_speed NUMERIC,
ADD COLUMN IF NOT EXISTS hiit_rest_speed NUMERIC,
ADD COLUMN IF NOT EXISTS hiit_cycles INTEGER;

-- 3. Add columns to set_logs table (actual completed metrics)
ALTER TABLE public.set_logs
ADD COLUMN IF NOT EXISTS time_completed INTEGER,
ADD COLUMN IF NOT EXISTS distance_completed NUMERIC,
ADD COLUMN IF NOT EXISTS speed_actual NUMERIC,
ADD COLUMN IF NOT EXISTS hiit_cycles_completed INTEGER;

-- 4. Create exercise_feedback_logs table
CREATE TABLE IF NOT EXISTS public.exercise_feedback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_log_id UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
    feedback_text TEXT NOT NULL,
    sentiment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_exercise_feedback_per_workout UNIQUE (workout_log_id, exercise_id)
);

-- 5. Enable RLS on exercise_feedback_logs
ALTER TABLE public.exercise_feedback_logs ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for exercise_feedback_logs
DROP POLICY IF EXISTS "Student manage exercise feedback logs" ON public.exercise_feedback_logs;
CREATE POLICY "Student manage exercise feedback logs" 
ON public.exercise_feedback_logs
FOR ALL 
TO authenticated
USING (
  workout_log_id IN (
    SELECT id FROM public.workout_logs WHERE student_id = auth.uid()
  )
)
WITH CHECK (
  workout_log_id IN (
    SELECT id FROM public.workout_logs WHERE student_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Coach see exercise feedback logs" ON public.exercise_feedback_logs;
CREATE POLICY "Coach see exercise feedback logs" 
ON public.exercise_feedback_logs
FOR SELECT 
TO authenticated
USING (
  workout_log_id IN (
    SELECT wl.id FROM public.workout_logs wl
    JOIN public.students_data sd ON wl.student_id = sd.id
    WHERE sd.coach_id = auth.uid()
  )
);
