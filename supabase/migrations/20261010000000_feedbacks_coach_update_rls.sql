-- Migração para fila de feedbacks do coach:
-- 1. Índice parcial para otimizar a contagem e filtro de treinos não lidos
CREATE INDEX IF NOT EXISTS idx_workout_logs_coach_unread 
ON public.workout_logs(student_id, read_by_coach) 
WHERE read_by_coach = false;

-- 2. Permitir que o treinador atualize o status read_by_coach dos treinos dos seus alunos vinculados
DROP POLICY IF EXISTS "Coach update read_by_coach" ON public.workout_logs;
CREATE POLICY "Coach update read_by_coach"
ON public.workout_logs
FOR UPDATE
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students_data WHERE coach_id = auth.uid()
  )
)
WITH CHECK (
  student_id IN (
    SELECT id FROM public.students_data WHERE coach_id = auth.uid()
  )
);
