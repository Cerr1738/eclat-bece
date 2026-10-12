-- Duel of Minds lifecycle: make challenges visible and finite.
--
-- Problems fixed here:
-- 1. Challenges were invisible: nothing ever notified the opponent, so duels
--    died as unseen `pending` rows. respond_arena_challenge now notifies the
--    challenger on accept/decline (challenge-issue + match-result
--    notifications are added alongside the RPCs that trigger them in
--    20261012090100).
-- 2. Nothing expired: the 'expired' status existed but no code path set it.
--    A lazy helper runs inside every arena RPC and a pg_cron job sweeps the
--    rest (pending > 48h, accepted-but-unplayed > 7d).
-- 3. RLS let either participant UPDATE any column of a challenge (scores,
--    winner_id, status) directly, bypassing the server-authoritative RPCs.
--    All writes now go through SECURITY DEFINER functions; participants keep
--    read access only.
-- 4. quiz_questions_year6/year9 (and their options tables) were readable by
--    every role INCLUDING anon — correct_answer, explanation and the
--    is_correct flag shipped to any unauthenticated caller. Policies are now
--    scoped TO authenticated.

-- ---------------------------------------------------------------------------
-- 1. Lazy expiry — pending challenges older than 48h and accepted challenges
--    older than 7 days are dead; retire them wherever arena state is read or
--    written so the hub never shows zombie duels.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_stale_arena_challenges()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired integer := 0;
  v_last integer;
BEGIN
  UPDATE public.arena_challenges
  SET status = 'expired'
  WHERE status = 'pending'
    AND created_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_expired = ROW_COUNT;

  UPDATE public.arena_challenges
  SET status = 'expired'
  WHERE status = 'accepted'
    AND created_at < now() - interval '7 days';
  GET DIAGNOSTICS v_last = ROW_COUNT;
  v_expired := v_expired + v_last;

  RETURN v_expired;
END;
$$;

-- Sweep on a schedule too, so history stays clean even when nobody calls in.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-arena-challenges') THEN
    PERFORM cron.unschedule('expire-arena-challenges');
  END IF;

  PERFORM cron.schedule(
    'expire-arena-challenges',
    '*/15 * * * *',
    'SELECT public.expire_stale_arena_challenges();'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. respond_arena_challenge — accept/decline goes through a validated RPC.
--    Replaces the client's direct-table UPDATE, which the tightened RLS below
--    now blocks. Opponent-only, pending-only, with a notification to the
--    challenger either way.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_arena_challenge(
  p_challenge_id uuid,
  p_accept boolean
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
  v_opponent_name text;
  v_challenger_user_id uuid;
  v_subject text;
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
  IF v_challenge.opponent_id <> v_student.id THEN
    RAISE EXCEPTION 'Only the challenged student can respond';
  END IF;
  IF v_challenge.status <> 'pending' THEN
    RAISE EXCEPTION 'Challenge is no longer pending';
  END IF;

  UPDATE public.arena_challenges
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END
  WHERE id = p_challenge_id;

  -- Notify the challenger that their duel was answered.
  SELECT s.user_id, COALESCE(p.full_name, p.username, 'A scholar'), c.subject
    INTO v_challenger_user_id, v_opponent_name, v_subject
  FROM public.students s
  JOIN public.profiles p ON p.id = s.user_id
  CROSS JOIN (SELECT subject FROM public.arena_challenges WHERE id = p_challenge_id) c
  WHERE s.id = v_challenge.challenger_id;

  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    v_challenger_user_id,
    CASE WHEN p_accept THEN 'duel_accepted' ELSE 'duel_declined' END,
    CASE WHEN p_accept THEN 'Duel accepted!' ELSE 'Duel declined' END,
    v_opponent_name || CASE WHEN p_accept
      THEN ' accepted your ' || v_subject || ' duel — the arena awaits.'
      ELSE ' declined your ' || v_subject || ' duel.' END,
    jsonb_build_object('challenge_id', p_challenge_id)
  );

  RETURN jsonb_build_object(
    'challenge_id', p_challenge_id,
    'status', CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.respond_arena_challenge(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_arena_challenge(uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS: challenges are read by participants, written only by RPCs.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Participants can update challenges" ON public.arena_challenges;
DROP POLICY IF EXISTS "Students can create challenges as challenger" ON public.arena_challenges;

-- ---------------------------------------------------------------------------
-- 4. Realtime: the Arena Hub subscribes to postgres_changes on this table.
--    The table must be in the supabase_realtime publication, and FULL replica
--    identity lets realtime apply RLS on UPDATE events (DEFAULT identity only
--    ships the primary key, which RLS cannot check against).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'arena_challenges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_challenges;
  END IF;
END;
$$;

ALTER TABLE public.arena_challenges REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------------
-- 4. Question bank: no more anon/world reads of answer keys.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view year 6 quiz questions" ON public.quiz_questions_year6;
CREATE POLICY "Authenticated users can view year 6 quiz questions"
  ON public.quiz_questions_year6
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view year 6 quiz options" ON public.quiz_options_year6;
CREATE POLICY "Authenticated users can view year 6 quiz options"
  ON public.quiz_options_year6
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view year 9 quiz questions" ON public.quiz_questions_year9;
CREATE POLICY "Authenticated users can view year 9 quiz questions"
  ON public.quiz_questions_year9
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view year 9 quiz options" ON public.quiz_options_year9;
CREATE POLICY "Authenticated users can view year 9 quiz options"
  ON public.quiz_options_year9
  FOR SELECT
  TO authenticated
  USING (true);
