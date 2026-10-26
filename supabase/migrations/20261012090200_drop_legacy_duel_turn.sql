-- Retire the legacy client-authoritative submit_duel_turn overload.
--
-- The arena-integrity migration (20261003170000) replaced duel scoring with
-- the server-authoritative (uuid, uuid) overload but never dropped the
-- original (uuid, integer, integer) version. That overload is SECURITY
-- DEFINER and accepts a client-supplied score with no session validation, so
-- a modified client could still post any result into the EP/league economy.
-- Nothing references it (the client calls the two-argument form); drop it.

DROP FUNCTION IF EXISTS public.submit_duel_turn(uuid, integer, integer);
