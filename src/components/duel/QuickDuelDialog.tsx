import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Play, Send, Swords, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errorUtils";
import { supabase } from "@/integrations/supabase/client";
import {
  createQuickDuel,
  startInstantDuel,
  DuelOpponent,
} from "@/services/gamification/arenaService";
import { OpponentPicker } from "./OpponentPicker";

interface QuickDuelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Instant Match mode: random classmate, no opponent picking. */
  instant?: boolean;
  challengerId: string | null;
  challengerName: string | null;
  classYear: string | null;
  onPlayRound: (challengeId: string) => void;
}

const QUESTION_COUNTS = [5, 10, 15];
const TIME_OPTIONS = [
  { label: "2 min", seconds: 120 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
];

/**
 * One-screen duel creation — subject + opponent + Send. Defaults: 10 random
 * questions in 2 minutes. Topics, question count and time hide behind the
 * Advanced expander. Replaces the old 4-step wizard.
 */
export function QuickDuelDialog({
  open,
  onOpenChange,
  instant = false,
  challengerId,
  challengerName,
  classYear,
  onPlayRound,
}: QuickDuelDialogProps) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [maxTimeSeconds, setMaxTimeSeconds] = useState(120);
  const [opponent, setOpponent] = useState<DuelOpponent | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ challengeId: string; opponentName: string } | null>(null);

  const yearKey = classYear === "year_6" ? "year_6" : "year_9";

  // Same sources as the Practice zone, so every duel can actually be played.
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["arena", "duel-subjects", yearKey],
    enabled: open && !!classYear,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("name, icon")
        .eq(yearKey === "year_6" ? "available_year_6" : "available_year_9", true)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ name: string; icon: string | null }>;
    },
  });

  const { data: topicOptions } = useQuery({
    queryKey: ["arena", "duel-topics", yearKey],
    enabled: open && !!classYear && !!subject,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const view = yearKey === "year_6" ? "topic_question_counts_year6" : "topic_question_counts_year9";
      const { data, error } = await supabase
        .from(view as never)
        .select("subject, topic, questions_count");
      if (error) throw error;
      return (data as unknown as Array<{ subject: string; topic: string; questions_count: number }>) ?? [];
    },
  });

  const availableTopics = useMemo(
    () => (topicOptions ?? []).filter((t) => t.subject === subject),
    [topicOptions, subject]
  );

  const resetForm = () => {
    setSubject("");
    setTopics([]);
    setQuestionCount(10);
    setMaxTimeSeconds(120);
    setOpponent(null);
    setAdvancedOpen(false);
    setResult(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const toggleTopic = (topic: string) => {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const canSend = instant ? !!subject : !!subject && !!opponent;

  const handleSend = async () => {
    if (!canSend || isSending) return;
    setIsSending(true);
    try {
      if (instant) {
        const created = await startInstantDuel({
          subject,
          topic: topics.length > 0 ? topics.join(", ") : null,
          questionCount,
          maxTimeSeconds,
        });
        setResult(created);
        toast.success(`Matched with ${created.opponentName}!`);
      } else {
        const challengeId = await createQuickDuel({
          challengerId: challengerId!,
          opponentId: opponent!.id,
          subject,
          topic: topics.length > 0 ? topics.join(", ") : null,
          questionCount,
          maxTimeSeconds,
          challengeName: `${challengerName || "You"} vs ${opponent!.name} — ${subject}`,
        });
        setResult({ challengeId, opponentName: opponent!.name });
        toast.success(`Duel sent to ${opponent!.name}!`);
      }
      queryClient.invalidateQueries({ queryKey: ["arena"] });
    } catch (err) {
      console.error("Failed to create duel:", err);
      toast.error(getErrorMessage(err, "Could not create the duel. Please try again."));
    } finally {
      setIsSending(false);
    }
  };

  const summary = `${questionCount} questions · ${Math.round(maxTimeSeconds / 60)} min${topics.length > 0 ? ` · ${topics.length} topic${topics.length > 1 ? "s" : ""}` : " · mixed topics"}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {result ? (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/15 text-purple-500 flex items-center justify-center border border-purple-500/30">
              <Swords className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Duel issued!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {instant
                  ? <>Matched with <span className="font-semibold text-foreground">{result.opponentName}</span>. Play your round now — they've been notified.</>
                  : <>{result.opponentName} has been challenged and notified. Play your round now!</>}
              </p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  handleOpenChange(false);
                  onPlayRound(result.challengeId);
                }}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Play Your Round Now
              </Button>
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full">
                Stay in Arena
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {instant ? <Wand2 className="w-5 h-5 text-purple-500" /> : <Swords className="w-5 h-5 text-purple-500" />}
                {instant ? "Instant Match" : "Quick Duel"}
              </DialogTitle>
              <DialogDescription>
                {instant
                  ? "We'll pick a random classmate for you. Same rules, zero setup."
                  : "Pick a subject and a classmate — that's it. 10 questions, 2 minutes."}
              </DialogDescription>
            </DialogHeader>

            {/* Subject */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Subject</p>
              {isLoadingSubjects ? (
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(subjects ?? []).map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        setSubject(s.name);
                        setTopics([]);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm border transition-colors",
                        subject === s.name
                          ? "bg-primary text-primary-foreground border-primary font-semibold"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      {s.icon ? `${s.icon} ` : ""}{s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Opponent (hidden in instant mode) */}
            {!instant && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Opponent</p>
                <OpponentPicker selected={opponent} onSelect={setOpponent} />
              </div>
            )}

            {/* Advanced */}
            <div className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors rounded-lg"
              >
                <span>Advanced settings</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", advancedOpen && "rotate-180")} />
              </button>
              {advancedOpen && (
                <div className="space-y-4 px-3 pb-3">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Topics (optional)</p>
                    {availableTopics.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {subject ? "No topics available — mixed topics will be used" : "Select a subject first"}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {availableTopics.map((t) => (
                          <Badge
                            key={t.topic}
                            variant={topics.includes(t.topic) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleTopic(t.topic)}
                          >
                            {t.topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Questions</p>
                    <div className="flex gap-2">
                      {QUESTION_COUNTS.map((count) => (
                        <Button
                          key={count}
                          type="button"
                          size="sm"
                          variant={questionCount === count ? "default" : "outline"}
                          onClick={() => setQuestionCount(count)}
                        >
                          {count}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Time limit</p>
                    <div className="flex gap-2">
                      {TIME_OPTIONS.map((option) => (
                        <Button
                          key={option.seconds}
                          type="button"
                          size="sm"
                          variant={maxTimeSeconds === option.seconds ? "default" : "outline"}
                          onClick={() => setMaxTimeSeconds(option.seconds)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Send */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">{summary}</p>
              <Button
                onClick={handleSend}
                disabled={!canSend || isSending}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold gap-2"
              >
                <Send className="w-4 h-4" />
                {isSending
                  ? instant ? "Finding opponent…" : "Sending…"
                  : instant ? "Find Opponent & Duel" : "Send Duel"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
