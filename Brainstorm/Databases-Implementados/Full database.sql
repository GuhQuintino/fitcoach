-- =============================================================================
-- FitCoach MVP: MASTER RESET SCRIPT
-- WARNING: THIS WILL DELETE ALL DATA IN THE DATABASE
-- Use this to fix "Error 500" or Schema Mismatches
-- =============================================================================
-- 1. CLEANUP (DROP EVERYTHING)
-- =============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS set_logs CASCADE;
DROP TABLE IF EXISTS workout_logs CASCADE;
DROP TABLE IF EXISTS student_assignments CASCADE;
DROP TABLE IF EXISTS workout_sets CASCADE;
DROP TABLE IF EXISTS workout_items CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS routines CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS students_data CASCADE;
DROP TABLE IF EXISTS coaches_data CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TYPE IF EXISTS set_type CASCADE;
DROP TYPE IF EXISTS muscle_group CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS account_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 2. SCHEMA CREATION
-- =============================================================================
CREATE TYPE user_role AS ENUM ('admin', 'coach', 'student');
CREATE TYPE account_status AS ENUM ('pending', 'active', 'rejected', 'banned');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'canceled');
CREATE TYPE muscle_group AS ENUM ('chest', 'back', 'legs', 'shoulders', 'arms', 'abs', 'cardio', 'full_body');
CREATE TYPE set_type AS ENUM ('warmup', 'working', 'failure', 'deload');
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role user_role NOT NULL DEFAULT 'student',
    full_name TEXT,
    avatar_url TEXT,
    status account_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE coaches_data (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    cref TEXT,
    phone TEXT,
    bio TEXT,
    subscription_status subscription_status DEFAULT 'trial',
    subscription_expires_at TIMESTAMPTZ,
    max_students INTEGER DEFAULT 5
);
CREATE TABLE students_data (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    consultancy_expires_at TIMESTAMPTZ,
    birth_date DATE,
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    goal TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = Public
    name TEXT NOT NULL,
    muscle_group muscle_group NOT NULL,
    video_url TEXT,
    image_url TEXT,
    description TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_weeks INTEGER DEFAULT 4,
    is_template BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE workout_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    order_index INTEGER NOT NULL DEFAULT 0,
    coach_notes TEXT
);
CREATE TABLE workout_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_item_id UUID NOT NULL REFERENCES workout_items(id) ON DELETE CASCADE,
    type set_type DEFAULT 'working',
    reps_target TEXT,
    rest_seconds INTEGER DEFAULT 60,
    rpe_target INTEGER,
    order_index INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE student_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE RESTRICT,
    started_at DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE workout_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    effort_rating INTEGER,
    feedback_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE set_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_log_id UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    set_type set_type DEFAULT 'working',
    weight_kg DECIMAL(5,2),
    reps_completed INTEGER,
    rpe_actual INTEGER,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);
-- 3. TRIGGERS (THE FIX FOR SIGNUP 500 ERROR)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_coach_id UUID;
BEGIN
  v_role := COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student');
  
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, status)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    'active'
  );
  IF v_role = 'coach' THEN
    INSERT INTO public.coaches_data (id) VALUES (new.id);
  ELSIF v_role = 'student' THEN
    BEGIN
      v_coach_id := (new.raw_user_meta_data->>'coach_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_coach_id := NULL;
    END;
    INSERT INTO public.students_data (id, coach_id) VALUES (new.id, v_coach_id);
  END IF;
  return new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- 4. RLS POLICIES (SECURITY)
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE students_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE;
-- Profiles
CREATE POLICY "Users can see own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Coaches see students profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM students_data WHERE id = profiles.id AND coach_id = auth.uid()));
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
-- Data Tables
CREATE POLICY "Coach see own data" ON coaches_data FOR ALL USING (auth.uid() = id);
CREATE POLICY "Student see own data" ON students_data FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Student update own data" ON students_data FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Coach manage students data" ON students_data FOR ALL USING (coach_id = auth.uid());
-- Exercises
CREATE POLICY "Coach see public and own exercises" ON exercises FOR ALL USING (
    (EXISTS (SELECT 1 FROM coaches_data WHERE id = auth.uid())) AND (coach_id IS NULL OR coach_id = auth.uid())
);
CREATE POLICY "Student see assigned exercises" ON exercises FOR SELECT USING (
    EXISTS (SELECT 1 FROM workout_items wi JOIN workouts w ON wi.workout_id = w.id JOIN student_assignments sa ON sa.routine_id = w.routine_id WHERE wi.exercise_id = exercises.id AND sa.student_id = auth.uid())
);
-- Routines & Workouts (Simplified for brevity, logic maintained)
CREATE POLICY "Coach manage routines" ON routines FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "Student read routines" ON routines FOR SELECT USING (id IN (SELECT routine_id FROM student_assignments WHERE student_id = auth.uid()));
CREATE POLICY "Coach manage workouts" ON workouts FOR ALL USING (routine_id IN (SELECT id FROM routines WHERE coach_id = auth.uid()));
CREATE POLICY "Student read workouts" ON workouts FOR SELECT USING (routine_id IN (SELECT routine_id FROM student_assignments WHERE student_id = auth.uid()));
-- ... (Items and Sets follow potentially same cascade logic or can be explicit)
CREATE POLICY "Coach manage items" ON workout_items FOR ALL USING (workout_id IN (SELECT w.id FROM workouts w JOIN routines r ON w.routine_id = r.id WHERE r.coach_id = auth.uid()));
CREATE POLICY "Student read items" ON workout_items FOR SELECT USING (workout_id IN (SELECT w.id FROM workouts w JOIN student_assignments sa ON sa.routine_id = w.routine_id WHERE sa.student_id = auth.uid()));
CREATE POLICY "Coach manage sets" ON workout_sets FOR ALL USING (workout_item_id IN (SELECT wi.id FROM workout_items wi JOIN workouts w ON wi.workout_id = w.id JOIN routines r ON w.routine_id = r.id WHERE r.coach_id = auth.uid()));
CREATE POLICY "Student read sets" ON workout_sets FOR SELECT USING (workout_item_id IN (SELECT wi.id FROM workout_items wi JOIN workouts w ON wi.workout_id = w.id JOIN student_assignments sa ON sa.routine_id = w.routine_id WHERE sa.student_id = auth.uid()));
-- Assignments
CREATE POLICY "Coach manage assignments" ON student_assignments FOR ALL USING (student_id IN (SELECT id FROM students_data WHERE coach_id = auth.uid()));
CREATE POLICY "Student read assignments" ON student_assignments FOR SELECT USING (student_id = auth.uid());
-- Logs
CREATE POLICY "Student manage logs" ON workout_logs FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Coach see logs" ON workout_logs FOR SELECT USING (student_id IN (SELECT id FROM students_data WHERE coach_id = auth.uid()));
CREATE POLICY "Student manage set logs" ON set_logs FOR ALL USING (workout_log_id IN (SELECT id FROM workout_logs WHERE student_id = auth.uid()));
CREATE POLICY "Coach see set logs" ON set_logs FOR SELECT USING (workout_log_id IN (SELECT wl.id FROM workout_logs wl JOIN students_data sd ON wl.student_id = sd.id WHERE sd.coach_id = auth.uid()));
-- 5. STORAGE BUCKETS (If user uses Supabase Storage)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-media', 'exercise-media', true) ON CONFLICT DO NOTHING;
-- Storage Policies
CREATE POLICY "Public Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "User Upload Avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Public Media" ON storage.objects FOR SELECT USING (bucket_id = 'exercise-media');
CREATE POLICY "Coach Upload Media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exercise-media' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('coach', 'admin')));