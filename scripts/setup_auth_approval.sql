-- =============================================================================
-- FitCoach Pro: AUTH & APPROVAL FLOW SETUP
-- Execute este script no SQL Editor do Supabase para ativar o fluxo de aprovação
-- e a persistência dos novos campos de cadastro (CREF, Medidas, etc).
-- =============================================================================

-- 1. Garantir que as colunas necessárias existam
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.students_data ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.coaches_data ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Atualizar a função de Trigger para o novo fluxo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_coach_id UUID;
  v_status account_status;
BEGIN
  -- 1. Extrair Role dos metadados (Padrão: student)
  BEGIN
    v_role := (new.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'student';
  END;
  
  IF v_role IS NULL THEN v_role := 'student'; END IF;

  -- 2. Determinar Status Inicial
  -- Admin é ativo por padrão, Coach e Student começam como 'pending'
  IF v_role = 'admin' THEN
    v_status := 'active';
  ELSE
    v_status := 'pending';
  END IF;

  -- 3. Criar ou Atualizar Perfil
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
    status = EXCLUDED.status,
    phone = EXCLUDED.phone;

  -- 4. Criar Dados Específicos
  IF v_role = 'coach' THEN
    INSERT INTO public.coaches_data (id, cref, phone, bio)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'cref',
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'bio'
    ) ON CONFLICT (id) DO UPDATE
    SET
      cref = EXCLUDED.cref,
      phone = EXCLUDED.phone,
      bio = EXCLUDED.bio;
  
  ELSIF v_role = 'student' THEN
    BEGIN
        v_coach_id := (new.raw_user_meta_data->>'coach_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_coach_id := NULL;
    END;
    
    INSERT INTO public.students_data (
      id, 
      coach_id, 
      birth_date, 
      height_cm, 
      weight_kg, 
      goal,
      phone
    ) VALUES (
      new.id, 
      v_coach_id,
      (new.raw_user_meta_data->>'birth_date')::DATE,
      (new.raw_user_meta_data->>'height_cm')::DECIMAL,
      (new.raw_user_meta_data->>'weight_kg')::DECIMAL,
      new.raw_user_meta_data->>'goal',
      new.raw_user_meta_data->>'phone'
    ) ON CONFLICT (id) DO UPDATE
    SET
      coach_id = EXCLUDED.coach_id,
      birth_date = EXCLUDED.birth_date,
      height_cm = EXCLUDED.height_cm,
      weight_kg = EXCLUDED.weight_kg,
      goal = EXCLUDED.goal,
      phone = EXCLUDED.phone;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Re-vincular Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
