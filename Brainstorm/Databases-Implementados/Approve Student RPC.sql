-- =============================================================================
-- FitCoach Feature: APPROVE STUDENT RPC
-- Purpose: Transactionally approve a student and set their plan expiration date
-- Date: 2025-12-21
-- =============================================================================

CREATE OR REPLACE FUNCTION public.approve_student(
    student_uuid UUID,
    expiration_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- 1. Check if the executing user is the coach of this student
    -- (RLS Policies handles this usually, but good to be explicit in RPC if SECURITY DEFINER)
    IF NOT EXISTS (
        SELECT 1 FROM public.students_data 
        WHERE id = student_uuid AND coach_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Not your student');
    END IF;

    -- 2. Update Profile Status to 'active'
    UPDATE public.profiles
    SET status = 'active'
    WHERE id = student_uuid;

    -- 3. Update Student Data with Expiration Date
    UPDATE public.students_data
    SET consultancy_expires_at = expiration_date
    WHERE id = student_uuid;

    -- 4. Return success
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
