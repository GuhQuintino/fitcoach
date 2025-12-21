-- =============================================================================
-- FitCoach Optimization: FIX APPROVAL PERMISSIONS
-- Purpose: Allow Coaches to update their students' profile status (Approve)
-- Date: 2025-12-20
-- =============================================================================

-- 1. ADD RLS POLICY FOR COACHES TO UPDATE STUDENTS
-- =============================================================================
-- Currently Configured: "Users update own profile"
-- Issue: Coaches get 403 when trying to update student status to 'active'

DROP POLICY IF EXISTS "Coaches update student profiles" ON profiles;

CREATE POLICY "Coaches update student profiles" ON profiles
FOR UPDATE
USING (
  -- Allow if the profile belongs to a student assigned to this coach
  EXISTS (
    SELECT 1 FROM public.students_data
    WHERE students_data.id = profiles.id
    AND students_data.coach_id = auth.uid()
  )
);

-- 2. VERIFY/ENSURE TRIGGER LOGIC FOR PENDING STATUS (SAFEGUARD)
-- =============================================================================
-- Ensuring handle_new_user correctly sets 'pending' for invited students.
-- (This was in the previous script but checking/re-applying ensures it sticks)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_coach_id UUID;
  v_status account_status;
BEGIN
  -- 1. Extract Role
  v_role := COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student');
  
  -- 2. Determine Status (CRITICAL FIX)
  -- If student has a coach_id in metadata (invite link), force 'pending'
  IF v_role = 'student' AND (new.raw_user_meta_data->>'coach_id') IS NOT NULL AND (new.raw_user_meta_data->>'coach_id') != '' THEN
      v_status := 'pending';
  ELSE
      v_status := 'active'; 
  END IF;

  -- 3. Insert Profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, status, phone)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    v_status,
    new.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email, 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;
    -- Note: We generally don't want to reset status on conflict unless necessary, 
    -- but for initial signup conflict it's fine.

  -- 4. Insert Data
  IF v_role = 'coach' THEN
    INSERT INTO public.coaches_data (id, phone) 
    VALUES (new.id, new.raw_user_meta_data->>'phone') 
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone;
  
  ELSIF v_role = 'student' THEN
    BEGIN
        v_coach_id := (new.raw_user_meta_data->>'coach_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_coach_id := NULL;
    END;
    INSERT INTO public.students_data (id, coach_id) 
    VALUES (new.id, v_coach_id) 
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
