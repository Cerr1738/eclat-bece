import { useState, useEffect } from "react";
import { ArrowLeft, Brain, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Award, BookOpen } from "lucide-react";

interface Activity {
  id: string;
  student_id: string;
  subject: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  completed_at: string;
  student_name?: string;
}

export default function ActivityFeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchFullActivities = async () => {
      if (!user) return;
      try {
        setLoading(true);

        // 1. Get Parent ID
        const { data: parentData } = await supabase
          .from("parents")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!parentData) return;

        // 2. Get children
        const { data: childrenData } = await supabase
          .from("students")
          .select("id, profile:profiles(full_name)")
          .eq("parent_id", parentData.id);

        if (!childrenData || childrenData.length === 0) {
          setLoading(false);
          return;
        }

        const childIds = childrenData.map((c) => c.id);
        const nameMap = new Map<string, string>(
          childrenData.map((c) => [c.id, c.profile?.full_name || "Unknown"])
        );

        // 3. Count total activities
        const { count, error: countError } = await supabase
          .from("quiz_results")
          .select("*", { count: "exact", head: true })
          .in("student_id", childIds);

        if (countError) throw countError;
        setTotalCount(count || 0);

        // 4. Fetch paginated activities
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data: results, error: resultsError } = await supabase
          .from("quiz_results")
          .select("*")
          .in("student_id", childIds)
          .order("completed_at", { ascending: false })
          .range(from, to);

        if (resultsError) throw resultsError;

        if (results) {
          const mapped = results.map((r) => ({
            ...r,
            student_name: nameMap.get(r.student_id),
          })) as Activity[];
          setActivities(mapped);
        }
      } catch (error) {
        console.error("Error loading activity feed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFullActivities();
  }, [user, currentPage]);

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <div className="w-full px-4 py-8 animate-fade-in pb-16 text-slate-100">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/dashboard/parent")}
          className="rounded-full border border-[#233148] bg-[#0c1628] text-slate-200 hover:bg-[#15273f] hover:border-[#3bc2f3] hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border border-[#2d4b68] bg-[#0c2438] text-[#58c4e8] mb-2">
            <Award className="h-3.5 w-3.5" />
            <span>Activity Logs</span>
          </div>
          <h2 className="text-3xl font-black text-[#71c9ed] tracking-tight flex items-center gap-2">
            Activity Feed History
            <span className="w-2 h-2 rounded-full bg-[#3bc2f3]" />
          </h2>
          <p className="text-slate-400 font-medium text-sm mt-1">
            Complete historical timeline of quiz activities across all linked children.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#3bc2f3]" />
          <p className="text-slate-400 font-medium animate-pulse">Loading activities...</p>
        </div>
      ) : activities.length === 0 ? (
        <Card className="border-2 border-dashed border-[#26344d] bg-[#0c1628] text-slate-100 rounded-2xl">
          <CardContent className="py-16 text-center flex flex-col items-center justify-center">
            <div className="bg-[#0c2438] w-16 h-16 rounded-full flex items-center justify-center mb-4 text-[#58c4e8]">
              <Brain className="h-8 w-8" />
            </div>
            <p className="font-bold text-lg text-white">No activities found</p>
            <p className="text-slate-400 text-sm max-w-xs mx-auto mt-1">
              Once your children complete their practice quizzes, their milestones will be logged here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-4 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[#3bc2f3]/40 before:via-[#202b43] before:to-transparent">
            {activities.map((activity) => (
              <div key={activity.id} className="relative flex items-start gap-4 group">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-[#233148] bg-[#0c2438] text-[#58c4e8] shadow-sm shrink-0 z-10 transition-transform duration-300 group-hover:scale-110 mt-1">
                  {activity.score >= 80 ? <Award className="h-4 w-4 text-[#48d7b7]" /> : <BookOpen className="h-4 w-4 text-[#58c4e8]" />}
                </div>

                <div className="flex-1 p-5 rounded-2xl border border-[#233148] bg-[#0c1628] shadow-sm hover:shadow-md transition-all duration-300 min-w-0 hover:border-[#3bc2f3]/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-white text-base truncate">
                        {activity.student_name}
                      </span>
                      <Badge className={`shrink-0 font-bold text-xs border ${activity.score >= 80 ? 'bg-[#102f2b] text-[#48d7b7] border-[#1d4f47]' : 'bg-[#18263e] text-slate-300 border-[#2a3c5a]'}`}>
                        {Math.round(activity.score)}%
                      </Badge>
                    </div>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.completed_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 leading-relaxed">
                    Completed a <strong className="text-white font-bold">{activity.subject}</strong> quiz
                    {" "}(<span className="font-mono text-[#3bc2f3] font-bold">{activity.correct_answers}/{activity.total_questions}</span> correct)
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-[#202b43]">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-xl font-bold gap-1 border border-[#233148] bg-[#0c1628] text-slate-200 hover:bg-[#15273f] hover:border-[#3bc2f3] hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm font-semibold text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-xl font-bold gap-1 border border-[#233148] bg-[#0c1628] text-slate-200 hover:bg-[#15273f] hover:border-[#3bc2f3] hover:text-white"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
