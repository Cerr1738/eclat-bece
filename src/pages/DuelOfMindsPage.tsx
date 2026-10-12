import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Swords,
  ArrowLeft,
  Clock,
  Play,
  Flame,
  Shield,
  Wand2,
  Trophy,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchIncomingChallenges,
  fetchStudentDuelHistory,
  respondToChallenge,
  rematchChallenge,
} from "@/services/gamification/arenaService";
import { ArenaChallenge } from "@/services/gamification/types";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/lib/errorUtils";
import { QuickDuelDialog } from "@/components/duel/QuickDuelDialog";

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

export default function DuelOfMindsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [quickDuelOpen, setQuickDuelOpen] = useState(false);
  const [instantOpen, setInstantOpen] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  // Signed-in student identity: arena queries key off the students.id.
  const { data: me } = useQuery({
    queryKey: queryKeys.arenaMe(user?.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: student, error } = await supabase
        .from("students")
        .select("id, class_year")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!student) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      return {
        id: student.id as string,
        classYear: (student.class_year as string | null) ?? null,
        name: (profile?.full_name as string | null) ?? null,
      };
    },
  });

  const incomingQuery = useQuery({
    queryKey: queryKeys.arenaIncoming(me?.id),
    enabled: !!me?.id,
    queryFn: () => fetchIncomingChallenges(me!.id),
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.arenaHistory(me?.id),
    enabled: !!me?.id,
    queryFn: () => fetchStudentDuelHistory(me!.id),
  });

  const incomingChallenges = incomingQuery.data ?? [];
  const duelHistory = historyQuery.data ?? [];

  const record = duelHistory.reduce(
    (acc, battle) => {
      if (battle.status !== "completed") return acc;
      if (battle.winnerId == null) acc.draws += 1;
      else if (battle.winnerId === me?.id) acc.wins += 1;
      else acc.losses += 1;
      return acc;
    },
    { wins: 0, losses: 0, draws: 0 }
  );

  // Realtime: any challenge touching this student (issue/accept/resolve —
  // RLS-filtered) refreshes the hub without a manual refresh button.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("arena-challenges-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "arena_challenges" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["arena"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const invalidateArena = () => queryClient.invalidateQueries({ queryKey: ["arena"] });

  const handleAcceptDuel = async (challenge: ArenaChallenge) => {
    setActingId(challenge.id);
    try {
      await respondToChallenge(challenge.id, true);
      toast.success("Challenge accepted! Entering the arena...");
      navigate(`/quiz?mode=duel&duelId=${challenge.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to accept challenge"));
      invalidateArena();
    } finally {
      setActingId(null);
    }
  };

  const handleDeclineDuel = async (challenge: ArenaChallenge) => {
    setActingId(challenge.id);
    try {
      await respondToChallenge(challenge.id, false);
      toast.info("Challenge declined");
      invalidateArena();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to decline challenge"));
    } finally {
      setActingId(null);
    }
  };

  const handleRematch = async (battle: ArenaChallenge) => {
    setActingId(battle.id);
    try {
      const challengeId = await rematchChallenge(battle.id);
      toast.success(`Rematch vs ${battle.challengerId === me?.id ? battle.opponentName : battle.challengerName} issued!`);
      navigate(`/quiz?mode=duel&duelId=${challengeId}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not start the rematch"));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back to dashboard"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => navigate("/dashboard/student")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/15 text-purple-500 border border-purple-500/30">
                <Swords size={14} />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-purple-500">
                Competitive Arena
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Duel of Minds
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
              Challenge classmates to rapid-fire academic showdowns — 10 questions, 2 minutes, winner takes the EP.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setInstantOpen(true)}
              className="gap-2 font-bold"
            >
              <Wand2 className="w-4 h-4 text-purple-500" />
              Instant Match
            </Button>
            <Button
              onClick={() => setQuickDuelOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold gap-2 shadow-lg shadow-purple-500/20"
            >
              <Swords className="w-4 h-4" />
              Quick Duel
            </Button>
          </div>
        </div>

        {/* Point Economy Rules Strip — matches submit_duel_turn exactly */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-xs">
              +50
            </div>
            <div>
              <div className="text-xs font-bold">Match Victory</div>
              <div className="text-[10px] text-muted-foreground">+50 EP per win</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-500 font-black text-xs">
              +20
            </div>
            <div>
              <div className="text-xs font-bold">Match Draw</div>
              <div className="text-[10px] text-muted-foreground">+20 EP for tie</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 font-black text-xs">
              +25
            </div>
            <div>
              <div className="text-xs font-bold">Upset Victory</div>
              <div className="text-[10px] text-muted-foreground">Defeat a 2+ league rival</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-500 font-black text-xs">
              🔥
            </div>
            <div>
              <div className="text-xs font-bold">Win Streaks</div>
              <div className="text-[10px] text-muted-foreground">+30, +75, +200 EP</div>
            </div>
          </div>
        </div>

        {/* Incoming Challenges */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>Incoming Challenges</span>
              {incomingChallenges.length > 0 && (
                <Badge className="bg-purple-500 text-white font-bold text-xs px-2 py-0.5">
                  {incomingChallenges.length}
                </Badge>
              )}
            </h2>
          </div>

          {incomingQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : incomingChallenges.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No pending challenges. Fire a Quick Duel or hit Instant Match to ignite the competition!
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingChallenges.map((challenge) => (
                <Card key={challenge.id} className="border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-card to-card shadow-md">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-purple-500/40">
                          <AvatarFallback className="bg-purple-500/15 text-purple-500 font-bold">
                            {getInitials(challenge.challengerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-sm font-bold">
                            {challenge.challengerName}
                          </CardTitle>
                          <CardDescription className="text-xs text-muted-foreground">
                            {challenge.challengerSchool || "Peer Scholar"}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-purple-500/40 text-purple-500 text-[10px]">
                        {challenge.subject}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40">
                      <span className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        {challenge.numberOfQuestions} Questions
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                        {Math.max(1, Math.round(challenge.maxTimeSeconds / 60))} Minutes
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        onClick={() => handleAcceptDuel(challenge)}
                        disabled={actingId === challenge.id}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs h-9 gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Accept & Duel
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDeclineDuel(challenge)}
                        disabled={actingId === challenge.id}
                        className="text-muted-foreground text-xs h-9"
                      >
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Duel History */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Battle Records</h2>
            {record.wins + record.losses + record.draws > 0 && (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-emerald-500">{record.wins}W</span>
                <span className="text-rose-500">{record.losses}L</span>
                <span className="text-sky-500">{record.draws}T</span>
              </div>
            )}
          </div>

          {historyQuery.isLoading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : duelHistory.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                You haven't participated in any arena duels yet. Complete your first match to earn the "First Blood" badge!
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-border/40">
                {duelHistory.map((battle) => {
                  const isChallenger = battle.challengerId === me?.id;
                  const myScore = isChallenger ? battle.challengerScore : battle.opponentScore;
                  const theirScore = isChallenger ? battle.opponentScore : battle.challengerScore;
                  const opponentName = isChallenger ? battle.opponentName : battle.challengerName;
                  const isWinner = battle.winnerId != null && battle.winnerId === me?.id;
                  const isDraw = battle.winnerId === null && battle.status === "completed";
                  const isExpiredOrDeclined =
                    battle.status === "expired" || battle.status === "declined";
                  const iPlayNext =
                    (battle.status === "pending" || battle.status === "accepted") &&
                    myScore == null;
                  const canRematch = battle.status === "completed";
                  const myEP = isChallenger ? battle.challengerEP : battle.opponentEP;

                  return (
                    <div
                      key={battle.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 text-sm hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                          {isWinner ? (
                            <Trophy className="w-4 h-4 text-emerald-500" />
                          ) : isDraw ? (
                            <Shield className="w-4 h-4 text-sky-500" />
                          ) : isExpiredOrDeclined ? (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          ) : battle.status === "completed" ? (
                            <span className="text-rose-500">LOSS</span>
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-2 flex-wrap">
                            <span>
                              <span className={isChallenger ? "font-bold text-foreground" : "text-muted-foreground"}>
                                {battle.challengerName}
                                {isChallenger && <span className="text-[11px] text-primary ml-1 font-semibold">(You)</span>}
                              </span>
                              <span className="text-muted-foreground mx-1.5 font-normal text-xs">vs</span>
                              <span className={!isChallenger ? "font-bold text-foreground" : "text-muted-foreground"}>
                                {battle.opponentName}
                                {!isChallenger && <span className="text-[11px] text-primary ml-1 font-semibold">(You)</span>}
                              </span>
                            </span>
                            <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                              {battle.subject}
                            </Badge>
                            {isExpiredOrDeclined && (
                              <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                                {battle.status}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {battle.status === "completed"
                              ? `Your Score: ${myScore ?? 0}/${battle.numberOfQuestions} • Opponent: ${theirScore ?? 0}/${battle.numberOfQuestions}`
                              : isExpiredOrDeclined
                              ? "No match played"
                              : iPlayNext
                              ? `Your turn • ${battle.numberOfQuestions} questions`
                              : `You scored ${myScore}/${battle.numberOfQuestions} • Awaiting opponent`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {iPlayNext && (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/quiz?mode=duel&duelId=${battle.id}`)}
                            className="bg-primary text-primary-foreground font-bold text-xs h-8 gap-1.5"
                          >
                            <Play className="w-3 h-3 fill-current" /> Play Turn
                          </Button>
                        )}
                        {canRematch && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRematch(battle)}
                            disabled={actingId === battle.id}
                            className="text-xs h-8 gap-1.5"
                          >
                            <RotateCcw className="w-3 h-3" /> Rematch
                          </Button>
                        )}
                        {myEP != null && myEP > 0 && battle.status === "completed" && (
                          <div className="text-right">
                            <span className="font-black text-amber-500 text-sm">+{myEP}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">EP</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Duel: pick a classmate. Instant Match: random classmate. */}
      <QuickDuelDialog
        open={quickDuelOpen}
        onOpenChange={setQuickDuelOpen}
        challengerId={me?.id ?? null}
        challengerName={me?.name ?? null}
        classYear={me?.classYear ?? null}
        onPlayRound={(challengeId) => navigate(`/quiz?mode=duel&duelId=${challengeId}`)}
      />
      <QuickDuelDialog
        open={instantOpen}
        onOpenChange={setInstantOpen}
        instant
        challengerId={me?.id ?? null}
        challengerName={me?.name ?? null}
        classYear={me?.classYear ?? null}
        onPlayRound={(challengeId) => navigate(`/quiz?mode=duel&duelId=${challengeId}`)}
      />
    </div>
  );
}
