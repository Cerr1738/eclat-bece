import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { searchOpponents, DuelOpponent } from "@/services/gamification/arenaService";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface OpponentPickerProps {
  selected: DuelOpponent | null;
  onSelect: (opponent: DuelOpponent) => void;
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

/**
 * Opponent discovery via search_duel_opponents (same cohort, scoped RPC).
 * Search-as-you-type hits the server's p_query — no client-side fan-out.
 */
export function OpponentPicker({ selected, onSelect }: OpponentPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: opponents, isLoading } = useQuery({
    queryKey: queryKeys.arenaOpponents(debouncedQuery),
    queryFn: () => searchOpponents(debouncedQuery),
    staleTime: 30 * 1000,
  });

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search classmates..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
        {isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (opponents ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No classmates found{query ? " — try another name" : " yet"}
          </div>
        ) : (
          (opponents ?? []).map((student) => {
            const isSelected = selected?.id === student.id;
            return (
              <button
                key={student.id}
                type="button"
                onClick={() => onSelect(student)}
                className={cn(
                  "flex w-full items-center gap-3 p-2.5 text-left border-b last:border-b-0 transition-colors hover:bg-muted/50",
                  isSelected && "bg-primary/10"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-xs font-bold">
                    {getInitials(student.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{student.name}</p>
                  {student.school && (
                    <p className="text-xs text-muted-foreground truncate">{student.school}</p>
                  )}
                </div>
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    isSelected && "border-primary bg-primary"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
