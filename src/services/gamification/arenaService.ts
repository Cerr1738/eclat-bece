/**
 * Head-to-Head Arena Service (Duel of Minds)
 *
 * All duel writes go through SECURITY DEFINER RPCs — direct table writes are
 * blocked by RLS. Challenges are created with server-picked questions, so the
 * client never touches the question bank. Fetchers throw on error so TanStack
 * Query can surface failure states instead of silently rendering empty lists.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  ArenaMatchResult,
  ArenaChallenge,
} from "./types";
import { submitDuelTurnServer } from "@/services/quizSession";

export interface DuelOpponent {
  id: string;
  name: string;
  username: string;
  school: string;
  classYear: string;
}

export interface QuickDuelInput {
  challengerId: string;
  opponentId: string;
  subject: string;
  topic?: string | null;
  questionCount: number;
  maxTimeSeconds: number;
  challengeName?: string;
}

/**
 * Issues a duel with server-picked questions (p_question_ids is null — the
 * RPC randomly selects p_question_count cohort-matched questions).
 */
export async function createQuickDuel(input: QuickDuelInput): Promise<string> {
  const { data, error } = await supabase.rpc("create_arena_challenge", {
    p_challenger_id: input.challengerId,
    p_opponent_id: input.opponentId,
    p_challenge_name: input.challengeName ?? "",
    p_subject: input.subject,
    p_topic: input.topic ?? null,
    p_max_time_seconds: input.maxTimeSeconds,
    p_question_ids: null,
    p_question_count: input.questionCount,
  });
  if (error) throw error;
  return data as string;
}

/** One-tap matchmaking: random classmate, server-picked questions. */
export async function startInstantDuel(input: {
  subject: string;
  topic?: string | null;
  questionCount?: number;
  maxTimeSeconds?: number;
}): Promise<{ challengeId: string; opponentName: string }> {
  const { data, error } = await supabase.rpc("start_instant_duel", {
    p_subject: input.subject,
    p_topic: input.topic ?? null,
    p_question_count: input.questionCount ?? 10,
    p_max_time_seconds: input.maxTimeSeconds ?? 120,
  });
  if (error) throw error;
  const result = data as unknown as { challenge_id: string; opponent_name: string };
  return { challengeId: result.challenge_id, opponentName: result.opponent_name };
}

/** Accept or decline an incoming challenge (opponent-only, server-validated). */
export async function respondToChallenge(
  challengeId: string,
  accept: boolean
): Promise<"accepted" | "declined"> {
  const { data, error } = await supabase.rpc("respond_arena_challenge", {
    p_challenge_id: challengeId,
    p_accept: accept,
  });
  if (error) throw error;
  const result = data as unknown as { status: "accepted" | "declined" };
  return result.status;
}

/** Re-issues a completed duel against the same opponent with fresh questions. */
export async function rematchChallenge(challengeId: string): Promise<string> {
  const { data, error } = await supabase.rpc("rematch_arena_challenge", {
    p_challenge_id: challengeId,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Opponent discovery through the school-scoped SECURITY DEFINER RPC: same
 * cohort as the caller, names resolved server-side.
 */
export async function searchOpponents(query: string, limit = 30): Promise<DuelOpponent[]> {
  const { data, error } = await supabase.rpc("search_duel_opponents", {
    p_query: query.trim() ? query.trim() : null,
    p_limit: limit,
  });
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.full_name || row.username || "Fellow Scholar",
    username: row.username || "",
    school: row.school_name || "",
    classYear: row.class_year || "",
  }));
}

/**
 * Fetches pending challenges where the current student is the opponent.
 */
export async function fetchIncomingChallenges(studentId: string): Promise<ArenaChallenge[]> {
  const { data, error } = await supabase.rpc("get_student_duel_challenges", {
    p_limit: 50,
  });

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.opponent_id === studentId && row.status === "pending")
    .map((row) => ({
      id: row.id,
      challengerId: row.challenger_id,
      opponentId: row.opponent_id,
      challengerName: row.challenger_name || row.challenger_username || "Fellow Scholar",
      opponentName: "You",
      challengerSchool: row.challenger_school ?? undefined,
      subject: row.subject,
      topic: row.topic ?? undefined,
      numberOfQuestions: (row.question_ids || []).length,
      maxTimeSeconds: row.max_time_seconds,
      status: row.status as ArenaChallenge["status"],
      createdAt: row.created_at,
    }));
}

/**
 * Fetches active or completed challenges for a student.
 */
export async function fetchStudentDuelHistory(studentId: string): Promise<ArenaChallenge[]> {
  const { data, error } = await supabase.rpc("get_student_duel_challenges", {
    p_limit: 30,
  });

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.challenger_id === studentId || row.opponent_id === studentId)
    .map((row) => ({
      id: row.id,
      challengerId: row.challenger_id,
      opponentId: row.opponent_id,
      challengerName: row.challenger_name || row.challenger_username || "Challenger",
      opponentName: row.opponent_name || row.opponent_username || "Opponent",
      challengerSchool: row.challenger_school ?? undefined,
      opponentSchool: row.opponent_school ?? undefined,
      subject: row.subject,
      topic: row.topic ?? undefined,
      numberOfQuestions: (row.question_ids || []).length,
      maxTimeSeconds: row.max_time_seconds,
      status: row.status as ArenaChallenge["status"],
      challengerScore: row.challenger_score ?? undefined,
      challengerTimeSeconds: row.challenger_time_taken ?? undefined,
      opponentScore: row.opponent_score ?? undefined,
      opponentTimeSeconds: row.opponent_time_taken ?? undefined,
      challengerEP: row.challenger_ep ?? undefined,
      opponentEP: row.opponent_ep ?? undefined,
      winnerId: row.winner_id,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined,
    }));
}

/**
 * Submits duel performance for a student and completes the match if both have
 * played. Server-authoritative: score and duration come from the recorded
 * quiz session; the server returns the full EP breakdown.
 */
export async function submitDuelTurn(params: {
  challengeId: string;
  sessionId: string;
}): Promise<{ isMatchComplete: boolean; matchResult?: ArenaMatchResult }> {
  const { challengeId, sessionId } = params;

  const result = await submitDuelTurnServer(challengeId, sessionId);

  if (!result.resolved) {
    return { isMatchComplete: false };
  }

  const outcome = (result.outcome ?? "draw") as ArenaMatchResult["outcome"];
  const breakdown = result.breakdown ?? [];
  const matchResult: ArenaMatchResult = {
    outcome,
    baseEP: breakdown.find((b) => b.category === "base")?.amount ?? 0,
    upsetBonusEP: result.upset_bonus ?? 0,
    streakBonusEP: result.streak_bonus ?? 0,
    totalEP: result.ep_awarded ?? 0,
    newWinStreak: result.new_win_streak ?? 0,
    isUpset: (result.upset_bonus ?? 0) > 0,
    cappedByCollusion: result.capped ?? false,
    breakdown,
  };
  return { isMatchComplete: true, matchResult };
}
