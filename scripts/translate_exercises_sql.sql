-- Phase 1: Reordering (Adjective -> Suffix)
-- Handle "Barbell X" -> "X with Barbell" (Temporary placeholder or direct PT suffix)
-- Postgres REGEXP_REPLACE flags: 'g' (global), 'i' (case insensitive)

-- Note: We use a specific order to prevent double replacements or messed up grammar.

-- 1. Move Equipment/Stance to End (English "Adjective Noun" -> PT "Noun Adjective")
-- Example: "Barbell Squat" -> "Squat com Barra"
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yBarbell (.+)', '\1 com Barra', 'gi') WHERE name ILIKE 'Barbell %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yDumbbell (.+)', '\1 com Halteres', 'gi') WHERE name ILIKE 'Dumbbell %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yKettlebell (.+)', '\1 com Kettlebell', 'gi') WHERE name ILIKE 'Kettlebell %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yCable (.+)', '\1 no Cabo', 'gi') WHERE name ILIKE 'Cable %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\ySmith (.+)', '\1 no Smith', 'gi') WHERE name ILIKE 'Smith %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yMachine (.+)', '\1 na Máquina', 'gi') WHERE name ILIKE 'Machine %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\ySeated (.+)', '\1 Sentado', 'gi') WHERE name ILIKE 'Seated %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yStanding (.+)', '\1 em Pé', 'gi') WHERE name ILIKE 'Standing %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yIncline (.+)', '\1 Inclinado', 'gi') WHERE name ILIKE 'Incline %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yDecline (.+)', '\1 Declinado', 'gi') WHERE name ILIKE 'Decline %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yWeighted (.+)', '\1 com Peso', 'gi') WHERE name ILIKE 'Weighted %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yWide-Grip (.+)', '\1 Pegada Aberta', 'gi') WHERE name ILIKE 'Wide-Grip %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yClose-Grip (.+)', '\1 Pegada Fechada', 'gi') WHERE name ILIKE 'Close-Grip %';
UPDATE exercises SET name = REGEXP_REPLACE(name, '\yReverse-Grip (.+)', '\1 Pegada Invertida', 'gi') WHERE name ILIKE 'Reverse-Grip %';

-- 2. Direct Translations (Nouns)
-- Note: \y is NOT standard Postgres. Postgres uses \m (start) and \M (end) or \b (boundary - depending on version).
-- Actually, Postgres uses `\m` and `\M` for word boundaries in regex. Or `\b` in newer versions.
-- To be safe, let's use `\m` and `\M` or just spaces handling.
-- Wait, `\y` is Emacs style?
-- Postgres Regex: `\m` matches start of word, `\M` matches end of word.
-- Let's replace `\y` with `\m` and `\M`. Or just logic.

UPDATE exercises SET name = REGEXP_REPLACE(name, '\mSquat\M', 'Agachamento', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mBench Press\M', 'Supino', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mDeadlift\M', 'Levantamento Terra', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mLeg Press\M', 'Leg Press', 'gi'); 
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mLunge\M', 'Afundo', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mPush-Up\M', 'Flexão de Braço', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mPush Up\M', 'Flexão de Braço', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mPull-Up\M', 'Barra Fixa', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mPull Up\M', 'Barra Fixa', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mChin-Up\M', 'Barra Fixa (Supinada)', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mShoulder Press\M', 'Desenvolvimento', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mOverhead Press\M', 'Desenvolvimento', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mMilitary Press\M', 'Desenvolvimento Militar', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mLateral Raise\M', 'Elevação Lateral', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mFront Raise\M', 'Elevação Frontal', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mCalf Raise\M', 'Elevação de Panturrilha', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mBicep Curl\M', 'Rosca Direta', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mHammer Curl\M', 'Rosca Martelo', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mTricep Extension\M', 'Extensão de Tríceps', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mTriceps Pushdown\M', 'Tríceps na Polia', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mSkullcrusher\M', 'Tríceps Testa', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mRow\M', 'Remada', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mLat Pulldown\M', 'Puxada Alta', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mFace Pull\M', 'Face Pull', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mCrunch\M', 'Abdominal', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mSit-Up\M', 'Abdominal', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mPlank\M', 'Prancha', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mMountain Climber\M', 'Alpinista', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mRussian Twist\M', 'Giro Russo', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mLeg Extension\M', 'Cadeira Extensora', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mLeg Curl\M', 'Mesa Flexora', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mStiff Leg Deadlift\M', 'Stiff', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mRomanian Deadlift\M', 'Levantamento Terra Romeno', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mGood Morning\M', 'Bom Dia', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mHip Thrust\M', 'Elevação Pélvica', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mGlute Bridge\M', 'Ponte de Glúteos', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mAbductor\M', 'Abdutora', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mAdductor\M', 'Adutora', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mFly\M', 'Crucifixo', 'gi');
UPDATE exercises SET name = REGEXP_REPLACE(name, '\mReverse Fly\M', 'Crucifixo Inverso', 'gi');

-- 3. Description Standardizations
UPDATE exercises SET description = REPLACE(description, '## Overview', '## Visão Geral');
UPDATE exercises SET description = REPLACE(description, 'Starting position', 'Posição inicial');
UPDATE exercises SET description = REPLACE(description, 'Repeat for the recommended amount of repetitions', 'Repita pela quantidade recomendada de repetições');
UPDATE exercises SET description = REPLACE(description, 'Tip:', 'Dica:');
UPDATE exercises SET description = REPLACE(description, 'Note:', 'Nota:');
UPDATE exercises SET description = REPLACE(description, 'Exhale', 'Expire');
UPDATE exercises SET description = REPLACE(description, 'Inhale', 'Inspire');
UPDATE exercises SET description = REPLACE(description, 'Hold for', 'Segure por');
UPDATE exercises SET description = REPLACE(description, 'seconds', 'segundos');

-- 4. Muscle Groups
UPDATE exercises SET muscle_group = 'peito' WHERE muscle_group = 'chest';
UPDATE exercises SET muscle_group = 'costas' WHERE muscle_group = 'back';
UPDATE exercises SET muscle_group = 'pernas' WHERE muscle_group = 'legs';
UPDATE exercises SET muscle_group = 'ombros' WHERE muscle_group = 'shoulders';
UPDATE exercises SET muscle_group = 'braços' WHERE muscle_group = 'arms';
UPDATE exercises SET muscle_group = 'abdômen' WHERE muscle_group = 'abs';
UPDATE exercises SET muscle_group = 'cardio' WHERE muscle_group = 'cardio';
