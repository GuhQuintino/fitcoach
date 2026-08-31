-- =============================================================================
-- Migration: Fix Privilege Escalation on public.profiles
-- Vulnerability: Authenticated students could update role to 'admin' / 'coach'
-- Solution: BEFORE UPDATE Trigger (handle_profile_update_security) + Clean RLS Policy
-- =============================================================================

-- 1. Create or replace the security trigger function
CREATE OR REPLACE FUNCTION public.handle_profile_update_security()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
  v_is_service_role BOOLEAN := FALSE;
  v_is_assigned_coach BOOLEAN := FALSE;
BEGIN
  -- 1. Identify if caller is service_role
  IF current_user = 'service_role' 
     OR (current_setting('request.jwt.claim.role', true) = 'service_role') THEN
    v_is_service_role := TRUE;
  END IF;

  -- 2. Identify if authenticated caller has admin role
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) INTO v_is_admin;
  END IF;

  -- 3. Identify if caller is the assigned coach of this student
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.students_data
      WHERE id = OLD.id AND coach_id = auth.uid()
    ) INTO v_is_assigned_coach;
  END IF;

  -- Rule 1: ID is immutable
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Não é permitido alterar o ID do perfil.' USING ERRCODE = '42501';
  END IF;

  -- Rule 2: ROLE can only be changed by admins or service_role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT (v_is_service_role OR v_is_admin) THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o papel (role) do usuário.' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Rule 3: STATUS can only be changed by admins, service_role, or the student's assigned coach
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (v_is_service_role OR v_is_admin OR v_is_assigned_coach) THEN
      RAISE EXCEPTION 'Permissão negada para alterar o status da conta.' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Rule 4: EMAIL cannot be altered directly via profiles table by non-admins
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    IF NOT (v_is_service_role OR v_is_admin) THEN
      NEW.email := OLD.email;
    END IF;
  END IF;

  -- Rule 5: created_at is immutable
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    NEW.created_at := OLD.created_at;
  END IF;

  -- Automatically refresh updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Bind the trigger to public.profiles
DROP TRIGGER IF EXISTS tr_protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER tr_protect_profile_sensitive_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_update_security();

-- 3. Ensure RLS Policy is cleanly set without recursive subqueries
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
