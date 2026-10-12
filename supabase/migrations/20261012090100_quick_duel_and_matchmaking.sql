-- Quick Duel + matchmaking + the real arena economy.
--
-- 1. create_arena_challenge v3: questions can be picked server-side
--    (p_question_ids NULL -> p_question_count random cohort questions), so the
--    client no longer shops for question IDs. The challenger also can no
--    longer mint duels as someone else. Issuing a challenge now notifies the
--    opponent.
-- 2. start_instant_duel: one-tap matchmaking against a random classmate
--    (same school first, then any same-cohort student).
-- 3. rematch_arena_challenge: re-issue a completed duel with fresh questions.
-- 4. submit_duel_turn v2: ports the arenaEngine economy into SQL — win-streak
--    bonuses (+30/+75/+200), the 2-matches-per-pair-per-day anti-collusion
--    cap, and upset detection aligned with the engine (tier gap >= 2). Also
--    fixes a long-standing bug: only the SECOND player to submit ever
--    received their EP in the ledger/profile/league — the first player's EP
--    was written to the display columns but never actually awarded. Both
--    players are now paid at resolution.

-- ---------------------------------------------------------------------------
-- 1a. Duel win streak on the gamification profile.
-- ---------------------------------------------------------------------------
ALTER TABLE public.student_gamification_profile
  ADD COLUMN IF NOT EXISTS duel_win_streak integer NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 1b. create_arena_challenge v3
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_arena_challenge(uuid, uuid, text, text, text, integer, uuid[]);

CREATE OR REPLACE FUNCTION public.create_arena_challenge(
  p_challenger_id uuid,
  p_opponent_id uuid,
  p_challenge_name text,
  p_subject text,
  p_topic text DEFAULT NULL,
  p_max_time_seconds integer DEFAULT 120,
  p_question_ids uuid[] DEFAULT NULL,
  p_question_count integer DEFAULT 10
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge_id uuid;
  v_challenger_class_year text;
  v_picked uuid[];
  v_missing integer;
  v_challenger_name text;
  v_opponent_user_id uuid;
  v_count integer;
BEGIN
  IF p_challenger_id IS NULL OR p_opponent_id IS NULL OR p_challenger_id = p_opponent_id THEN
    RAISE EXCEPTION 'Invalid duel participants';
  END IF;

  -- Only the signed-in student may issue a duel in their own name.
  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_challenger_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You can only issue duels as yourself';
  END IF;

  SELECT class_year INTO v_challenger_class_year
  FROM public.students WHERE id = p_challenger_id;
  IF v_challenger_class_year IS NULL THEN
    RAISE EXCEPTION 'Challenger has no class year';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_opponent_id AND class_year = v_challenger_class_year
  ) THEN
    RAISE EXCEPTION 'Opponent must be in the same class year as the challenger';
  END IF;

  IF p_question_ids IS NOT NULL AND COALESCE(array_length(p_question_ids, 1), 0) > 20 THEN
    p_question_ids := p_question_ids[1:20];
  END IF;

  IF p_question_ids IS NULL OR COALESCE(array_length(p_question_ids, 1), 0) = 0 THEN
    -- Server-side pick: random cohort questions for the subject (+ topics).
    -- Topic is a comma-joined list when the challenger selected several.
    SELECT array_agg(id) INTO v_picked
    FROM (
      SELECT q.id
      FROM (
        SELECT id, subject, topic FROM public.quiz_questions_year9
        WHERE v_challenger_class_year = 'year_9'
        UNION ALL
        SELECT id, subject, topic FROM public.quiz_questions_year6
        WHERE v_challenger_class_year <> 'year_9'
      ) q
      WHERE q.subject = p_subject
        AND (p_topic IS NULL OR q.topic = ANY(string_to_array(p_topic, ',')))
      ORDER BY random()
      LIMIT LEAST(GREATEST(COALESCE(p_question_count, 10), 1), 20)
    ) pick;

    IF v_picked IS NULL THEN
      RAISE EXCEPTION 'No questions are available for % yet — try another subject or topic', p_subject;
    END IF;
    p_question_ids := v_picked;
  ELSE
    -- Explicit IDs must still be real, cohort-matched questions.
    IF v_challenger_class_year = 'year_9' THEN
      SELECT count(*) INTO v_missing
      FROM unnest(p_question_ids) AS qid
      WHERE NOT EXISTS (SELECT 1 FROM public.quiz_questions_year9 q WHERE q.id = qid);
    ELSE
      SELECT count(*) INTO v_missing
      FROM unnest(p_question_ids) AS qid
      WHERE NOT EXISTS (SELECT 1 FROM public.quiz_questions_year6 q WHERE q.id = qid);
    END IF;
    IF v_missing > 0 THEN
      RAISE EXCEPTION 'Challenge questions must belong to the challenger''s class year';
    END IF;
  END IF;

  INSERT INTO public.arena_challenges (
    challenger_id,
    opponent_id,
    challenge_name,
    subject,
    topic,
    max_time_seconds,
    question_ids,
    status
  ) VALUES (
    p_challenger_id,
    p_opponent_id,
    COALESCE(NULLIF(trim(p_challenge_name), ''), 'Head-to-Head Duel'),
    p_subject,
    p_topic,
    GREATEST(30, COALESCE(p_max_time_seconds, 120)),
    p_question_ids,
    'pending'
  )
  RETURNING id INTO v_challenge_id;

  -- The duel must be visible to the opponent: notify them immediately.
  SELECT s.user_id INTO v_opponent_user_id
  FROM public.students s WHERE s.id = p_opponent_id;

  SELECT COALESCE(p.full_name, p.username, 'A scholar') INTO v_challenger_name
  FROM public.students s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.id = p_challenger_id;

  v_count := COALESCE(array_length(p_question_ids, 1), 0);

  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    v_opponent_user_id,
    'duel_challenge',
    'Duel challenge!',
    v_challenger_name || ' challenged you to a ' || p_subject || ' duel — '
      || v_count || ' questions, ' || GREATEST(1, ROUND(GREATEST(30, COALESCE(p_max_time_seconds, 120)) / 60.0))
      || ' min. Accept in the Arena.',
    jsonb_build_object('challenge_id', v_challenge_id)
  );

  RETURN v_challenge_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_arena_challenge(uuid, uuid, text, text, text, integer, uuid[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_arena_challenge(uuid, uuid, text, text, text, integer, uuid[], integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. start_instant_duel — one tap, random classmate, duel fired.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_instant_duel(
  p_subject text,
  p_topic text DEFAULT NULL,
  p_question_count integer DEFAULT 10,
  p_max_time_seconds integer DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_me public.students;
  v_my_name text;
  v_opponent_id uuid;
  v_opponent_name text;
  v_challenge_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.expire_stale_arena_challenges();

  SELECT * INTO v_me FROM public.students WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  SELECT COALESCE(p.full_name, p.username, 'A scholar') INTO v_my_name
  FROM public.profiles p WHERE p.id = v_me.user_id;

  -- Random same-cohort classmate; same school first.
  SELECT s.id, COALESCE(p.full_name, p.username, 'A scholar')
    INTO v_opponent_id, v_opponent_name
  FROM public.students s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.class_year = v_me.class_year
    AND s.id <> v_me.id
  ORDER BY (s.school_id IS NOT DISTINCT FROM v_me.school_id) DESC, random()
  LIMIT 1;

  IF v_opponent_id IS NULL THEN
    RAISE EXCEPTION 'No classmates are available to duel yet';
  END IF;

  v_challenge_id := public.create_arena_challenge(
    p_challenger_id := v_me.id,
    p_opponent_id := v_opponent_id,
    p_challenge_name := v_my_name || ' vs ' || v_opponent_name || ' — ' || p_subject,
    p_subject := p_subject,
    p_topic := p_topic,
    p_max_time_seconds := p_max_time_seconds,
    p_question_ids := NULL,
    p_question_count := p_question_count
  );

  RETURN jsonb_build_object('challenge_id', v_challenge_id, 'opponent_name', v_opponent_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_instant_duel(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_instant_duel(text, text, integer, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. rematch_arena_challenge — re-issue a completed duel, fresh questions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rematch_arena_challenge(p_challenge_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_me public.students;
  v_old public.arena_challenges;
  v_new_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.expire_stale_arena_challenges();

  SELECT * INTO v_me FROM public.students WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  SELECT * INTO v_old FROM public.arena_challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  IF v_old.challenger_id <> v_me.id AND v_old.opponent_id <> v_me.id THEN
    RAISE EXCEPTION 'Not a participant of this challenge';
  END IF;
  IF v_old.status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed duels can be rematched';
  END IF;

  v_new_id := public.create_arena_challenge(
    p_challenger_id := v_me.id,
    p_opponent_id := CASE WHEN v_old.challenger_id = v_me.id THEN v_old.opponent_id ELSE v_old.challenger_id END,
    p_challenge_name := v_old.challenge_name,
    p_subject := v_old.subject,
    p_topic := v_old.topic,
    p_max_time_seconds := v_old.max_time_seconds,
    p_question_ids := NULL,
    p_question_count := GREATEST(1, COALESCE(array_length(v_old.question_ids, 1), 10))
  );

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rematch_arena_challenge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rematch_arena_challenge(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. submit_duel_turn v2 — full economy, both players paid, everyone notified.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_duel_turn(
  p_challenge_id uuid,
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_student public.students;
  v_challenge public.arena_challenges;
  v_session public.quiz_sessions;
  v_is_challenger boolean;
  v_is_opponent boolean;
  v_score integer;
  v_time_taken integer;
  v_winner_id uuid := NULL;
  v_outcome text;
  v_caller_ep integer := 0;
  v_upset_bonus integer := 0;
  v_streak_bonus integer := 0;
  v_new_streak integer := 0;
  v_capped boolean := false;
  v_pair_today integer := 0;
  v_breakdown jsonb := '[]'::jsonb;
  -- Both sides' payouts
  v_challenger_ep integer := 0;
  v_opponent_ep integer := 0;
  v_challenger_new_streak integer;
  v_opponent_new_streak integer;
  v_challenger_tier integer;
  v_opponent_tier integer;
  v_challenger_user_id uuid;
  v_opponent_user_id uuid;
  v_challenger_name text;
  v_opponent_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.expire_stale_arena_challenges();

  SELECT * INTO v_student FROM public.students WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  SELECT * INTO v_challenge FROM public.arena_challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  v_is_challenger := v_challenge.challenger_id = v_student.id;
  v_is_opponent := v_challenge.opponent_id = v_student.id;
  IF NOT (v_is_challenger OR v_is_opponent) THEN
    RAISE EXCEPTION 'Not a participant of this challenge';
  END IF;
  IF v_challenge.status = 'completed' THEN
    RAISE EXCEPTION 'Challenge already completed';
  END IF;
  IF v_challenge.status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Challenge is no longer playable';
  END IF;

  -- Idempotency: if the caller's turn is already recorded, return the stored
  -- state without re-recording or re-awarding EP.
  IF (v_is_challenger AND v_challenge.challenger_score IS NOT NULL)
     OR (v_is_opponent AND v_challenge.opponent_score IS NOT NULL) THEN
    IF v_challenge.status = 'completed' THEN
      v_outcome := CASE
        WHEN v_challenge.winner_id IS NULL THEN 'draw'
        WHEN v_challenge.winner_id = v_student.id THEN 'win'
        ELSE 'loss'
      END;
      v_caller_ep := CASE WHEN v_is_challenger THEN v_challenge.challenger_ep ELSE v_challenge.opponent_ep END;
      RETURN jsonb_build_object('status', 'completed', 'resolved', true, 'outcome', v_outcome,
        'ep_awarded', v_caller_ep, 'capped', false, 'breakdown', '[]'::jsonb);
    END IF;
    RETURN jsonb_build_object('status', v_challenge.status, 'resolved', false);
  END IF;

  -- The turn must reference the caller's own completed session for this duel.
  SELECT * INTO v_session FROM public.quiz_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz session not found';
  END IF;
  IF v_session.student_id <> v_student.id THEN
    RAISE EXCEPTION 'Session does not belong to this student';
  END IF;
  IF v_session.arena_challenge_id IS DISTINCT FROM p_challenge_id THEN
    RAISE EXCEPTION 'Session does not belong to this challenge';
  END IF;
  IF v_session.status <> 'completed' OR v_session.completed_at IS NULL THEN
    RAISE EXCEPTION 'Quiz session is not completed';
  END IF;

  -- Score and duration come from the server record, never the client.
  SELECT count(*) INTO v_score
  FROM public.quiz_session_answers
  WHERE session_id = p_session_id AND is_correct;

  v_time_taken := GREATEST(0, EXTRACT(EPOCH FROM (v_session.completed_at - v_session.started_at))::integer);

  -- Record the caller's turn
  IF v_is_challenger THEN
    UPDATE public.arena_challenges
    SET challenger_score = v_score,
        challenger_time_taken = v_time_taken,
        status = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END
    WHERE id = p_challenge_id;
  ELSE
    UPDATE public.arena_challenges
    SET opponent_score = v_score,
        opponent_time_taken = v_time_taken,
        status = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END
    WHERE id = p_challenge_id;
  END IF;

  -- If both turns are in, resolve the duel server-side
  SELECT * INTO v_challenge FROM public.arena_challenges WHERE id = p_challenge_id;
  IF v_challenge.challenger_score IS NULL OR v_challenge.opponent_score IS NULL THEN
    RETURN jsonb_build_object('status', v_challenge.status, 'resolved', false);
  END IF;

  -- Winner: higher score; tie broken by faster time
  IF v_challenge.challenger_score > v_challenge.opponent_score
     OR (v_challenge.challenger_score = v_challenge.opponent_score
         AND COALESCE(v_challenge.challenger_time_taken, 0) < COALESCE(v_challenge.opponent_time_taken, 0)) THEN
    v_winner_id := v_challenge.challenger_id;
  ELSIF v_challenge.opponent_score > v_challenge.challenger_score
     OR (v_challenge.opponent_score = v_challenge.challenger_score
         AND COALESCE(v_challenge.opponent_time_taken, 0) < COALESCE(v_challenge.challenger_time_taken, 0)) THEN
    v_winner_id := v_challenge.opponent_id;
  END IF;

  -- Names/ids for notifications (both sides)
  SELECT s.user_id, COALESCE(p.full_name, p.username, 'A scholar')
    INTO v_challenger_user_id, v_challenger_name
  FROM public.students s JOIN public.profiles p ON p.id = s.user_id
  WHERE s.id = v_challenge.challenger_id;
  SELECT s.user_id, COALESCE(p.full_name, p.username, 'A scholar')
    INTO v_opponent_user_id, v_opponent_name
  FROM public.students s JOIN public.profiles p ON p.id = s.user_id
  WHERE s.id = v_challenge.opponent_id;

  -- Ensure gamification profiles exist before reading/writing tiers+streaks.
  INSERT INTO public.student_gamification_profile (student_id)
  VALUES (v_challenge.challenger_id), (v_challenge.opponent_id)
  ON CONFLICT (student_id) DO NOTHING;

  SELECT current_league_tier INTO v_challenger_tier FROM public.student_gamification_profile WHERE student_id = v_challenge.challenger_id;
  SELECT current_league_tier INTO v_opponent_tier FROM public.student_gamification_profile WHERE student_id = v_challenge.opponent_id;

  -- Anti-collusion cap (arenaEngine MAX_DAILY_MATCHES_PER_PAIR = 2): once a
  -- pair has completed 2 matches today, further matches still resolve (so the
  -- UI shows an honest result) but award 0 EP and leave streaks untouched.
  SELECT count(*) INTO v_pair_today
  FROM public.arena_challenges c
  WHERE c.status = 'completed'
    AND c.completed_at >= date_trunc('day', now())
    AND (
      (c.challenger_id = v_challenge.challenger_id AND c.opponent_id = v_challenge.opponent_id)
      OR (c.challenger_id = v_challenge.opponent_id AND c.opponent_id = v_challenge.challenger_id)
    );

  IF v_pair_today >= 2 THEN
    v_capped := true;

    UPDATE public.arena_challenges
    SET winner_id = v_winner_id,
        status = 'completed',
        completed_at = now(),
        challenger_ep = 0,
        opponent_ep = 0
    WHERE id = p_challenge_id;

    v_outcome := CASE
      WHEN v_winner_id IS NULL THEN 'draw'
      WHEN v_winner_id = v_student.id THEN 'win'
      ELSE 'loss'
    END;

    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES
      (v_challenger_user_id, 'duel_result', 'Duel complete',
        'Daily duel limit with ' || v_opponent_name || ' reached — today''s rematches award no EP.',
        jsonb_build_object('challenge_id', p_challenge_id, 'outcome', 'capped')),
      (v_opponent_user_id, 'duel_result', 'Duel complete',
        'Daily duel limit with ' || v_challenger_name || ' reached — today''s rematches award no EP.',
        jsonb_build_object('challenge_id', p_challenge_id, 'outcome', 'capped'));

    v_breakdown := jsonb_build_array(jsonb_build_object(
      'category', 'session_bonus',
      'label', 'Anti-Collusion Cap Reached',
      'amount', 0,
      'description', 'Daily limit of 2 matches between this pair reached. Further matches today yield 0 EP.'
    ));

    RETURN jsonb_build_object(
      'status', 'completed',
      'resolved', true,
      'outcome', v_outcome,
      'ep_awarded', 0,
      'upset_bonus', 0,
      'streak_bonus', 0,
      'new_win_streak', 0,
      'capped', true,
      'breakdown', v_breakdown
    );
  END IF;

  -- Base economy (arenaEngine ARENA_BASE_REWARDS)
  IF v_winner_id IS NULL THEN
    v_challenger_ep := 20;
    v_opponent_ep := 20;
    v_outcome := 'draw';
    -- Draw: streaks untouched
    SELECT duel_win_streak INTO v_challenger_new_streak FROM public.student_gamification_profile WHERE student_id = v_challenge.challenger_id;
    SELECT duel_win_streak INTO v_opponent_new_streak FROM public.student_gamification_profile WHERE student_id = v_challenge.opponent_id;
  ELSE
    -- Upset bonus (engine: winner at least 2 tiers below the loser)
    IF (v_winner_id = v_challenge.challenger_id AND v_challenger_tier <= v_opponent_tier - 2)
       OR (v_winner_id = v_challenge.opponent_id AND v_opponent_tier <= v_challenger_tier - 2) THEN
      v_upset_bonus := 25;
    END IF;

    -- Win streak: winner +1 (bonus at 3/5/10), loser resets to 0.
    SELECT duel_win_streak INTO v_challenger_new_streak FROM public.student_gamification_profile WHERE student_id = v_challenge.challenger_id;
    SELECT duel_win_streak INTO v_opponent_new_streak FROM public.student_gamification_profile WHERE student_id = v_challenge.opponent_id;

    IF v_winner_id = v_challenge.challenger_id THEN
      v_challenger_new_streak := v_challenger_new_streak + 1;
      v_opponent_new_streak := 0;
    ELSE
      v_opponent_new_streak := v_opponent_new_streak + 1;
      v_challenger_new_streak := 0;
    END IF;

    v_streak_bonus := CASE
      WHEN v_challenger_new_streak = 3 OR v_opponent_new_streak = 3 THEN 30
      WHEN v_challenger_new_streak = 5 OR v_opponent_new_streak = 5 THEN 75
      WHEN v_challenger_new_streak = 10 OR v_opponent_new_streak = 10 THEN 200
      ELSE 0
    END;

    v_challenger_ep := CASE WHEN v_winner_id = v_challenge.challenger_id THEN 50 + v_upset_bonus + v_streak_bonus ELSE 5 END;
    v_opponent_ep := CASE WHEN v_winner_id = v_challenge.opponent_id THEN 50 + v_upset_bonus + v_streak_bonus ELSE 5 END;
    v_outcome := CASE WHEN v_winner_id = v_student.id THEN 'win' ELSE 'loss' END;

    UPDATE public.student_gamification_profile
    SET duel_win_streak = CASE student_id
        WHEN v_challenge.challenger_id THEN v_challenger_new_streak
        ELSE v_opponent_new_streak END,
      updated_at = now()
    WHERE student_id IN (v_challenge.challenger_id, v_challenge.opponent_id);
  END IF;

  v_new_streak := CASE WHEN v_is_challenger THEN v_challenger_new_streak ELSE v_opponent_new_streak END;

  UPDATE public.arena_challenges
  SET winner_id = v_winner_id,
      status = 'completed',
      completed_at = now(),
      challenger_ep = v_challenger_ep,
      opponent_ep = v_opponent_ep
  WHERE id = p_challenge_id;

  v_caller_ep := CASE WHEN v_is_challenger THEN v_challenger_ep ELSE v_opponent_ep END;

  -- Caller's EP breakdown for the results ledger UI
  v_breakdown := jsonb_build_array(
    jsonb_build_object(
      'category', 'base',
      'label', CASE WHEN v_caller_ep > 0 AND v_outcome = 'win' THEN 'Arena Victory (+50 EP)'
                    WHEN v_outcome = 'draw' THEN 'Arena Tie (+20 EP)'
                    WHEN v_outcome = 'loss' THEN 'Arena Participation (+5 EP)'
                    ELSE 'Match result' END,
      'amount', CASE WHEN v_outcome = 'win' THEN 50 WHEN v_outcome = 'draw' THEN 20 ELSE 5 END,
      'description', 'Match result: ' || upper(v_outcome)
    )
  );
  IF v_upset_bonus > 0 AND (v_outcome = 'win' OR (v_is_challenger AND v_winner_id = v_challenge.challenger_id) OR (v_is_opponent AND v_winner_id = v_challenge.opponent_id)) THEN
    v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
      'category', 'session_bonus',
      'label', 'Upset Victory Bonus (+25 EP)',
      'amount', v_upset_bonus,
      'description', 'Defeated an opponent 2+ leagues above you!'
    ));
  END IF;
  IF v_streak_bonus > 0 AND v_caller_ep > 5 THEN
    v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
      'category', 'streak_bonus',
      'label', 'Arena Win Streak (' || v_new_streak || ' in a row)',
      'amount', v_streak_bonus,
      'description', 'Dominant competitive form: ' || v_new_streak || ' consecutive duel victories!'
    ));
  END IF;

  -- Award BOTH players through ledger + profile + league cohort. (The old
  -- version only ever paid the student making this final submit; the first
  -- player's EP existed only in the display columns.)
  INSERT INTO public.student_points_ledger (student_id, amount, source_type, reference_id, metadata)
  VALUES
    (v_challenge.challenger_id, v_challenger_ep, 'duel', p_challenge_id,
      jsonb_build_object('outcome', CASE WHEN v_winner_id IS NULL THEN 'draw' WHEN v_winner_id = v_challenge.challenger_id THEN 'win' ELSE 'loss' END,
        'score', v_challenge.challenger_score, 'upset_bonus', v_upset_bonus, 'streak_bonus', v_streak_bonus)),
    (v_challenge.opponent_id, v_opponent_ep, 'duel', p_challenge_id,
      jsonb_build_object('outcome', CASE WHEN v_winner_id IS NULL THEN 'draw' WHEN v_winner_id = v_challenge.opponent_id THEN 'win' ELSE 'loss' END,
        'score', v_challenge.opponent_score, 'upset_bonus', v_upset_bonus, 'streak_bonus', v_streak_bonus));

  UPDATE public.student_gamification_profile
  SET lifetime_ep = lifetime_ep + CASE student_id WHEN v_challenge.challenger_id THEN v_challenger_ep ELSE v_opponent_ep END,
      weekly_ep = weekly_ep + CASE student_id WHEN v_challenge.challenger_id THEN v_challenger_ep ELSE v_opponent_ep END,
      updated_at = now()
  WHERE student_id IN (v_challenge.challenger_id, v_challenge.opponent_id);

  PERFORM public.assign_student_to_weekly_cohort(v_challenge.challenger_id);
  PERFORM public.assign_student_to_weekly_cohort(v_challenge.opponent_id);
  PERFORM public.update_student_cohort_points(v_challenge.challenger_id, v_challenger_ep);
  PERFORM public.update_student_cohort_points(v_challenge.opponent_id, v_opponent_ep);

  -- Notify both players with their personal outcome.
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES
    (
      v_challenger_user_id,
      'duel_result',
      CASE WHEN v_winner_id IS NULL THEN 'Duel drawn!'
           WHEN v_winner_id = v_challenge.challenger_id THEN 'Arena victory!'
           ELSE 'Duel concluded' END,
      CASE
        WHEN v_winner_id IS NULL THEN 'Your ' || v_challenge.subject || ' duel vs ' || v_opponent_name || ' ended in a draw. +' || v_challenger_ep || ' EP.'
        WHEN v_winner_id = v_challenge.challenger_id THEN 'You beat ' || v_opponent_name || ' in your ' || v_challenge.subject || ' duel! +' || v_challenger_ep || ' EP.'
        ELSE v_opponent_name || ' won your ' || v_challenge.subject || ' duel. +' || v_challenger_ep || ' EP for showing up — rematch?' END,
      jsonb_build_object('challenge_id', p_challenge_id,
        'outcome', CASE WHEN v_winner_id IS NULL THEN 'draw' WHEN v_winner_id = v_challenge.challenger_id THEN 'win' ELSE 'loss' END)
    ),
    (
      v_opponent_user_id,
      'duel_result',
      CASE WHEN v_winner_id IS NULL THEN 'Duel drawn!'
           WHEN v_winner_id = v_challenge.opponent_id THEN 'Arena victory!'
           ELSE 'Duel concluded' END,
      CASE
        WHEN v_winner_id IS NULL THEN 'Your ' || v_challenge.subject || ' duel vs ' || v_challenger_name || ' ended in a draw. +' || v_opponent_ep || ' EP.'
        WHEN v_winner_id = v_challenge.opponent_id THEN 'You beat ' || v_challenger_name || ' in your ' || v_challenge.subject || ' duel! +' || v_opponent_ep || ' EP.'
        ELSE v_challenger_name || ' won your ' || v_challenge.subject || ' duel. +' || v_opponent_ep || ' EP for showing up — rematch?' END,
      jsonb_build_object('challenge_id', p_challenge_id,
        'outcome', CASE WHEN v_winner_id IS NULL THEN 'draw' WHEN v_winner_id = v_challenge.opponent_id THEN 'win' ELSE 'loss' END)
    );

  RETURN jsonb_build_object(
    'status', 'completed',
    'resolved', true,
    'outcome', v_outcome,
    'ep_awarded', v_caller_ep,
    'upset_bonus', v_upset_bonus,
    'streak_bonus', v_streak_bonus,
    'new_win_streak', v_new_streak,
    'capped', false,
    'breakdown', v_breakdown
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_duel_turn(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_duel_turn(uuid, uuid) TO authenticated;
