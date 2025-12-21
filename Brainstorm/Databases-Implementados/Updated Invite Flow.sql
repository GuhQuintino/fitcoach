-- =============================================================================
-- FitCoach Feature: INVITE FLOW & PHONE SUPPORT
-- Purpose: Add phone to profiles, update signup trigger for status & contact
-- Date: 2025-12-20
-- =============================================================================

-- 1. ADD PHONE COLUMN TO PROFILES
-- =============================================================================
-- Shared by Coaches and Students
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. UPDATE TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_coach_id UUID;
  v_status account_status;
BEGIN
  -- 1. Extract Role (Safely)
  v_role := COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student');
  
  -- 2. Determine Status
  -- Coaches usually start valid (or trial), Students invited start as 'pending'
  IF v_role = 'student' AND (new.raw_user_meta_data->>'coach_id') IS NOT NULL THEN
      v_status := 'pending';
  ELSE
      v_status := 'active'; -- Regular signup or Coach
  END IF;

  -- 3. Create Profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, status, phone)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    v_status,
    new.raw_user_meta_data->>'phone' -- Capture Phone
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email, 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;

  -- 4. Create Specific Data
  IF v_role = 'coach' THEN
    -- Also sync phone to coaches_data if preferred, but keeping in profiles is enough for now.
    -- coaches_data already had 'phone', we can duplicate or remove later. 
    -- For now, let's just ensure the record exists.
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

-- Re-apply trigger just to be safe (already done above but ensures clean state)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
