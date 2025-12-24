-- Wrapped updates to catch unique violations
-- Phase 1: Reordering

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mBarbell (.+)', '\1 com Barra', 'gi') WHERE name ILIKE 'Barbell %';
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mDumbbell (.+)', '\1 com Halteres', 'gi') WHERE name ILIKE 'Dumbbell %';
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mKettlebell (.+)', '\1 com Kettlebell', 'gi') WHERE name ILIKE 'Kettlebell %';
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mCable (.+)', '\1 no Cabo', 'gi') WHERE name ILIKE 'Cable %';
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mSmith (.+)', '\1 no Smith', 'gi') WHERE name ILIKE 'Smith %';
EXCEPTION WHEN unique_violation THEN NULL; END $$;

-- Phase 2: Translations

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mSquat\M', 'Agachamento', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mBench Press\M', 'Supino', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mDeadlift\M', 'Levantamento Terra', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mLunge\M', 'Afundo', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mPush-Up\M', 'Flexão de Braço', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mPush Up\M', 'Flexão de Braço', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mPull-Up\M', 'Barra Fixa', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mPull Up\M', 'Barra Fixa', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mChin-Up\M', 'Barra Fixa (Supinada)', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mShoulder Press\M', 'Desenvolvimento', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mOverhead Press\M', 'Desenvolvimento', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mMilitary Press\M', 'Desenvolvimento Militar', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mLateral Raise\M', 'Elevação Lateral', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mFront Raise\M', 'Elevação Frontal', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mCalf Raise\M', 'Elevação de Panturrilha', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mBicep Curl\M', 'Rosca Direta', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mHammer Curl\M', 'Rosca Martelo', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mTricep Extension\M', 'Extensão de Tríceps', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mTriceps Pushdown\M', 'Tríceps na Polia', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mSkullcrusher\M', 'Tríceps Testa', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mRow\M', 'Remada', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mLat Pulldown\M', 'Puxada Alta', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mFace Pull\M', 'Face Pull', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mCrunch\M', 'Abdominal', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mSit-Up\M', 'Abdominal', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mPlank\M', 'Prancha', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mMountain Climber\M', 'Alpinista', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mRussian Twist\M', 'Giro Russo', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mLeg Extension\M', 'Cadeira Extensora', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mLeg Curl\M', 'Mesa Flexora', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mStiff Leg Deadlift\M', 'Stiff', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mRomanian Deadlift\M', 'Levantamento Terra Romeno', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mHip Thrust\M', 'Elevação Pélvica', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mGlute Bridge\M', 'Ponte de Glúteos', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mAbductor\M', 'Abdutora', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mAdductor\M', 'Adutora', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mFly\M', 'Crucifixo', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

DO $$ BEGIN
    UPDATE exercises SET name = REGEXP_REPLACE(name, '\mReverse Fly\M', 'Crucifixo Inverso', 'gi');
EXCEPTION WHEN unique_violation THEN NULL; END $$;

-- Descriptions (No unique constraint risk)
UPDATE exercises SET description = REPLACE(description, '## Overview', '## Visão Geral');
UPDATE exercises SET description = REPLACE(description, 'Starting position', 'Posição inicial');
UPDATE exercises SET description = REPLACE(description, 'Repeat for the recommended amount of repetitions', 'Repita pela quantidade recomendada de repetições');
UPDATE exercises SET description = REPLACE(description, 'Tip:', 'Dica:');
UPDATE exercises SET description = REPLACE(description, 'Note:', 'Nota:');
UPDATE exercises SET description = REPLACE(description, 'Exhale', 'Expire');
UPDATE exercises SET description = REPLACE(description, 'Inhale', 'Inspire');
UPDATE exercises SET description = REPLACE(description, 'Hold for', 'Segure por');
UPDATE exercises SET description = REPLACE(description, 'seconds', 'segundos');

-- Muscle Groups
UPDATE exercises SET muscle_group = 'peito' WHERE muscle_group = 'chest';
UPDATE exercises SET muscle_group = 'costas' WHERE muscle_group = 'back';
UPDATE exercises SET muscle_group = 'pernas' WHERE muscle_group = 'legs';
UPDATE exercises SET muscle_group = 'ombros' WHERE muscle_group = 'shoulders';
UPDATE exercises SET muscle_group = 'braços' WHERE muscle_group = 'arms';
UPDATE exercises SET muscle_group = 'abdômen' WHERE muscle_group = 'abs';
UPDATE exercises SET muscle_group = 'cardio' WHERE muscle_group = 'cardio';
