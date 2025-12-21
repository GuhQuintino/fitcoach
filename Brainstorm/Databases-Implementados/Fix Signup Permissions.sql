-- =============================================================================
-- FitCoach MVP: SIGNUP FIX SCRIPT
-- Purpose: Fix Error 500 by granting explicit permissions and refining the trigger
-- Date: 2025-12-20
-- =============================================================================
-- 1. Grant Permissions to Supabase Roles
-- Often required after dropping/recreating tables
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
-- 2. Refine Trigger Function (Safer handling)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_coach_id UUID;
BEGIN
  -- Set search path for security
  -- (Prevents using objects from other schemas implicitly)
  
  -- 1. Extract Role (Safely)
  BEGIN
    v_role := (new.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'student'; -- Fallback if casting fails
  END;
  
  IF v_role IS NULL THEN v_role := 'student'; END IF;
  -- 2. Create Profile (Idempotent: ON CONFLICT DO NOTHING to avoid crashes if retry)
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, status)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email, 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role; 
    -- If it existed (phantom), verify role matches
  -- 3. Create Specific Data (Check existence first)
  IF v_role = 'coach' THEN
    INSERT INTO public.coaches_data (id) VALUES (new.id) ON CONFLICT (id) DO NOTHING;
  
  ELSIF v_role = 'student' THEN
    -- Try to find coach_id
    BEGIN
        v_coach_id := (new.raw_user_meta_data->>'coach_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_coach_id := NULL;
    END;
    INSERT INTO public.students_data (id, coach_id) VALUES (new.id, v_coach_id) ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Re-Apply Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- 3. Verify RLS for Insert (Just in case)
-- Ensure new users can insert their own profile (Trigger runs as Superuser but good practice)
-- (Already covered by "Users can insert own profile" policy if RLS active)