-- Migration: 20261012100000_fix_duel_resolution_and_cohort_auth.sql
-- Fixes:
-- 1. Permits arena challenge co-participants to assign weekly cohorts and update
--    cohort points during duel turn resolution (preventing P0001 rollback on opponent submit).
-- 2. Adds get_student_duel_challenges() SECURITY DEFINER RPC to return opponent and challenger
--    names/schools without getting stripped by profiles RLS.

-- 1. assign_student_to_weekly_cohort: permit caller if co-participant in arena challenge
CREATE OR REPLACE FUNCTION public.assign_student_to_weekly_cohort(p_student_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier integer;
  v_week_start date;
  v_cohort_id uuid;
  v_cohort_num integer;
  v_user_id uuid := auth.uid();
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT COALESCE(public.is_admin(v_user_id), false) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.students
        WHERE id = p_student_id AND user_id = v_user_id
      ) AND NOT EXISTS (
        SELECT 1 FROM public.arena_challenges ac
        JOIN public.students s_caller ON s_caller.user_id = v_user_id
        WHERE (
          (ac.challenger_id = p_student_id AND ac.opponent_id = s_caller.id)
          OR (ac.opponent_id = p_student_id AND ac.challenger_id = s_caller.id)
        )
      ) THEN
        RAISE EXCEPTION 'Not permitted to assign cohort for this student';
      END IF;
    END IF;
  END IF;

  v_week_start := date_trunc('week', now() AT TIME ZONE 'utc')::date;

  SELECT c.id INTO v_cohort_id
  FROM public.league_cohort_members m
  JOIN public.league_cohorts c ON c.id = m.cohort_id
  WHERE m.student_id = p_student_id
    AND c.week_start_date = v_week_start
  LIMIT 1;

  IF v_cohort_id IS NOT NULL THEN
    RETURN v_cohort_id;
  END IF;

  SELECT COALESCE(current_league_tier, 1) INTO v_tier
  FROM public.student_gamification_profile
  WHERE student_id = p_student_id;
  IF v_tier IS NULL THEN
    v_tier := 1;
  END IF;

  SELECT c.id INTO v_cohort_id
  FROM public.league_cohorts c
  WHERE c.league_tier = v_tier
    AND c.week_start_date = v_week_start
    AND (
      SELECT count(*) FROM public.league_cohort_members cm WHERE cm.cohort_id = c.id
    ) < 30
  ORDER BY c.cohort_number ASC
  LIMIT 1;

  IF v_cohort_id IS NULL THEN
    SELECT COALESCE(MAX(cohort_number), 0) + 1 INTO v_cohort_num
    FROM public.league_cohorts
    WHERE league_tier = v_tier
      AND week_start_date = v_week_start;

    INSERT INTO public.league_cohorts (league_tier, week_start_date, cohort_number)
    VALUES (v_tier, v_week_start, v_cohort_num)
    RETURNING id INTO v_cohort_id;
  END IF;

  INSERT INTO public.league_cohort_members (cohort_id, student_id, weekly_points)
  VALUES (
    v_cohort_id,
    p_student_id,
    COALESCE((
      SELECT weekly_ep FROM public.student_gamification_profile WHERE student_id = p_student_id
    ), 0)
  )
  ON CONFLICT (cohort_id, student_id) DO NOTHING;

  RETURN v_cohort_id;
END;
$$;

-- 2. update_student_cohort_points: permit caller if co-participant in arena challenge
CREATE OR REPLACE FUNCTION public.update_student_cohort_points(
  p_student_id uuid,
  p_additional_ep integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cohort_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT COALESCE(public.is_admin(v_user_id), false)
       AND NOT EXISTS (
         SELECT 1 FROM public.students WHERE id = p_student_id AND user_id = v_user_id
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.arena_challenges ac
         JOIN public.students s_caller ON s_caller.user_id = v_user_id
         WHERE (
           (ac.challenger_id = p_student_id AND ac.opponent_id = s_caller.id)
           OR (ac.opponent_id = p_student_id AND ac.challenger_id = s_caller.id)
         )
       ) THEN
      RAISE EXCEPTION 'Not permitted to update cohort points for this student';
    END IF;
  END IF;

  v_cohort_id := public.assign_student_to_weekly_cohort(p_student_id);

  UPDATE public.league_cohort_members
  SET weekly_points = weekly_points + p_additional_ep
  WHERE cohort_id = v_cohort_id
    AND student_id = p_student_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_student_to_weekly_cohort(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_student_to_weekly_cohort(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_student_cohort_points(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_student_cohort_points(uuid, integer) TO authenticated, service_role;

-- 3. get_student_duel_challenges: SECURITY DEFINER RPC to return opponent and challenger names/schools
CREATE OR REPLACE FUNCTION public.get_student_duel_challenges(
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  challenger_id uuid,
  opponent_id uuid,
  challenge_name text,
  subject text,
  topic text,
  question_ids uuid[],
  max_time_seconds integer,
  status text,
  challenger_score integer,
  challenger_time_taken integer,
  opponent_score integer,
  opponent_time_taken integer,
  challenger_ep integer,
  opponent_ep integer,
  winner_id uuid,
  created_at timestamptz,
  completed_at timestamptz,
  challenger_name text,
  challenger_username text,
  challenger_school text,
  opponent_name text,
  opponent_username text,
  opponent_school text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH me AS (
    SELECT s.id AS my_student_id
    FROM public.students s
    WHERE s.user_id = auth.uid()
  )
  SELECT
    c.id,
    c.challenger_id,
    c.opponent_id,
    c.challenge_name,
    c.subject,
    c.topic,
    c.question_ids,
    c.max_time_seconds,
    c.status,
    c.challenger_score,
    c.challenger_time_taken,
    c.opponent_score,
    c.opponent_time_taken,
    c.challenger_ep,
    c.opponent_ep,
    c.winner_id,
    c.created_at,
    c.completed_at,
    COALESCE(cp.full_name, cp.username, 'Challenger') AS challenger_name,
    cp.username AS challenger_username,
    cs_school.school_name AS challenger_school,
    COALESCE(op.full_name, op.username, 'Opponent') AS opponent_name,
    op.username AS opponent_username,
    os_school.school_name AS opponent_school
  FROM public.arena_challenges c
  CROSS JOIN me
  LEFT JOIN public.students cs ON cs.id = c.challenger_id
  LEFT JOIN public.profiles cp ON cp.id = cs.user_id
  LEFT JOIN public.schools cs_school ON cs_school.id = cs.school_id
  LEFT JOIN public.students os ON os.id = c.opponent_id
  LEFT JOIN public.profiles op ON op.id = os.user_id
  LEFT JOIN public.schools os_school ON os_school.id = os.school_id
  WHERE me.my_student_id IS NOT NULL
    AND (c.challenger_id = me.my_student_id OR c.opponent_id = me.my_student_id)
  ORDER BY c.created_at DESC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 50), 1), 200);
$$;

REVOKE EXECUTE ON FUNCTION public.get_student_duel_challenges(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_duel_challenges(integer) TO authenticated;
