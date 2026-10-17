-- Migration: 20261017190000_prevent_teacher_email_conflicts.sql
-- Description: Prevents schools from assigning or creating teacher accounts with
-- email addresses that already belong to another user (parent, student, admin, school,
-- or another teacher). Includes a real-time availability check RPC and a hard database trigger.

-- 1. Helper RPC for real-time frontend email availability checking
CREATE OR REPLACE FUNCTION public.check_teacher_email_availability(
  check_email text,
  exclude_teacher_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_clean_email text;
  v_user_id uuid;
  v_user_role text;
  v_other_teacher_id uuid;
  v_other_teacher_name text;
  v_current_teacher_user_id uuid;
BEGIN
  IF check_email IS NULL OR trim(check_email) = '' THEN
    RETURN jsonb_build_object(
      'available', false,
      'conflict_type', 'empty',
      'message', 'An email address is required.'
    );
  END IF;

  v_clean_email := lower(trim(check_email));

  -- If editing an existing teacher, retrieve their current user_id
  IF exclude_teacher_id IS NOT NULL THEN
    SELECT user_id INTO v_current_teacher_user_id
    FROM public.school_teachers
    WHERE id = exclude_teacher_id;
  END IF;

  -- Check 1: Does this email belong to an existing user in auth.users?
  SELECT u.id, ur.role::text INTO v_user_id, v_user_role
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE lower(u.email) = v_clean_email
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- If this is the teacher's own already-linked user account, allow it
    IF v_current_teacher_user_id IS NOT NULL AND v_user_id = v_current_teacher_user_id THEN
      -- Allowed (own account)
      NULL;
    ELSE
      RETURN jsonb_build_object(
        'available', false,
        'conflict_type', 'existing_user',
        'conflict_role', COALESCE(v_user_role, 'user'),
        'message', format('This email is already registered to an existing %s account. Teachers require a unique email address.', COALESCE(v_user_role, 'registered'))
      );
    END IF;
  END IF;

  -- Check 2: Does this email already belong to another teacher in school_teachers?
  SELECT st.id, st.full_name INTO v_other_teacher_id, v_other_teacher_name
  FROM public.school_teachers st
  WHERE lower(trim(st.email)) = v_clean_email
    AND (exclude_teacher_id IS NULL OR st.id != exclude_teacher_id)
  LIMIT 1;

  IF v_other_teacher_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'conflict_type', 'existing_teacher',
      'conflict_teacher_name', v_other_teacher_name,
      'message', format('This email is already assigned to teacher "%s" in the directory.', v_other_teacher_name)
    );
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'message', 'Email is available'
  );
END;
$$;

-- Grant execution to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.check_teacher_email_availability(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_teacher_email_availability(text, uuid) TO service_role;

-- 2. Database Trigger Function to enforce email integrity on school_teachers writes
CREATE OR REPLACE FUNCTION public.validate_school_teacher_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_clean_email text;
  v_existing_user_id uuid;
  v_existing_user_role text;
  v_other_teacher_id uuid;
  v_other_teacher_name text;
BEGIN
  IF NEW.email IS NULL OR trim(NEW.email) = '' THEN
    NEW.email := NULL;
    RETURN NEW;
  END IF;

  v_clean_email := lower(trim(NEW.email));
  NEW.email := v_clean_email;

  -- Check 1: Is this email already registered in auth.users to someone else?
  SELECT u.id, ur.role::text INTO v_existing_user_id, v_existing_user_role
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE lower(u.email) = v_clean_email
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    -- If this is NOT the user linked to this teacher record, reject
    IF NEW.user_id IS NULL OR NEW.user_id != v_existing_user_id THEN
      RAISE EXCEPTION 'This email is already registered to an existing % account. A teacher cannot use an email belonging to another user.',
        COALESCE(v_existing_user_role, 'user')
        USING ERRCODE = '23505';
    END IF;
  END IF;

  -- Check 2: Is this email already assigned to another teacher in school_teachers?
  SELECT st.id, st.full_name INTO v_other_teacher_id, v_other_teacher_name
  FROM public.school_teachers st
  WHERE lower(trim(st.email)) = v_clean_email
    AND (TG_OP = 'INSERT' OR st.id != NEW.id)
  LIMIT 1;

  IF v_other_teacher_id IS NOT NULL THEN
    RAISE EXCEPTION 'This email is already assigned to teacher "%" in the directory.', v_other_teacher_name
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_validate_school_teacher_email'
  ) THEN
    CREATE TRIGGER trg_validate_school_teacher_email
      BEFORE INSERT OR UPDATE OF email, user_id ON public.school_teachers
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_school_teacher_email();
  END IF;
END $$;
