import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Search, Sparkles, BookOpen, Plus, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AssignPracticeDialog } from "@/components/AssignPracticeDialog";
import { LinkedChild } from "@/types/parent";
import { toast } from "sonner";

interface AssignmentDisplay {
  id: string;
  title: string;
  child: string;
  childId?: string;
  subject: string;
  status: "Overdue" | "Pending" | "Completed";
  due: string;
  questions?: number;
  duration?: number;
}

const fallbackNeedsAttention: AssignmentDisplay[] = [
  {
    id: "att-1",
    title: "Advanced Algebra Worksheet",
    child: "Ore Alle",
    subject: "Mathematics",
    status: "Overdue",
    due: "2 days ago",
    questions: 15,
    duration: 25,
  },
  {
    id: "att-2",
    title: "Physics Lab Report & Quiz",
    child: "Ore Alle",
    subject: "Basic Science",
    status: "Overdue",
    due: "Yesterday",
    questions: 20,
    duration: 30,
  },
];

const fallbackUpcoming: AssignmentDisplay[] = [
  {
    id: "up-1",
    title: "English Literature Grammar Revision",
    child: "Weird Ore",
    subject: "English Language",
    status: "Pending",
    due: "Due tomorrow, 11:59 PM",
    questions: 20,
    duration: 30,
  },
  {
    id: "up-2",
    title: "BECE Social Studies Practice",
    child: "Ore Alle",
    subject: "Social Studies",
    status: "Pending",
    due: "Due in 3 days",
    questions: 15,
    duration: 20,
  },
];

const fallbackRecent: AssignmentDisplay[] = [
  {
    id: "rec-1",
    title: "Living Things & Environment Quiz",
    child: "Weird Ore",
    subject: "Basic Science",
    status: "Completed",
    due: "Completed today",
    questions: 15,
    duration: 20,
  },
  {
    id: "rec-2",
    title: "French Vocabulary & Grammar",
    child: "Ore Alle",
    subject: "French",
    status: "Completed",
    due: "Completed yesterday",
    questions: 25,
    duration: 35,
  },
];

export default function ParentAssignmentsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentFilter, setSelectedStudentFilter] = useState("all");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTargetChild, setAssignTargetChild] = useState<LinkedChild | null>(null);

  const [needsAttention, setNeedsAttention] = useState<AssignmentDisplay[]>(fallbackNeedsAttention);
  const [upcoming, setUpcoming] = useState<AssignmentDisplay[]>(fallbackUpcoming);
  const [recent, setRecent] = useState<AssignmentDisplay[]>(fallbackRecent);

  useEffect(() => {
    const fetchParentAssignments = async () => {
      if (!user) return;
      try {
        const { data: parentData } = await supabase
          .from("parents")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!parentData) return;

        // Fetch children
        const { data: studentsData } = await supabase
          .from("students")
          .select(`
            id,
            user_id,
            class_year,
            is_premium,
            profile:profiles(full_name, unique_id, username)
          `)
          .eq("parent_id", parentData.id);

        if (studentsData && studentsData.length > 0) {
          const linked: LinkedChild[] = studentsData.map((s) => ({
            id: s.id,
            user_id: s.user_id,
            class_year: s.class_year || "year_9",
            is_premium: s.is_premium || false,
            profile: {
              full_name: (s.profile as any)?.full_name || null,
              unique_id: (s.profile as any)?.unique_id || "",
              username: (s.profile as any)?.username || null,
            },
          }));
          setChildren(linked);

          // Fetch actual assignments
          const childIds = linked.map((c) => c.id);
          const { data: assignmentsData } = await supabase
            .from("practice_assignments")
            .select("id, student_id, subject, topics, num_questions, duration, status, created_at")
            .in("student_id", childIds)
            .order("created_at", { ascending: false });

          if (assignmentsData && assignmentsData.length > 0) {
            const childMap = new Map(linked.map((c) => [c.id, c.profile.full_name || "Child"]));
            const pendingList: AssignmentDisplay[] = [];
            const completedList: AssignmentDisplay[] = [];

            assignmentsData.forEach((item) => {
              const topics = Array.isArray(item.topics) ? item.topics.join(", ") : "";
              const childName = childMap.get(item.student_id) || "Child";
              const title = topics ? `${item.subject} (${topics})` : `${item.subject} Practice`;

              const entry: AssignmentDisplay = {
                id: item.id,
                title,
                child: childName,
                childId: item.student_id,
                subject: item.subject,
                status: item.status === "completed" ? "Completed" : "Pending",
                due: item.status === "completed" ? "Finished" : "Active Practice",
                questions: item.num_questions,
                duration: item.duration,
              };

              if (item.status === "completed") {
                completedList.push(entry);
              } else {
                pendingList.push(entry);
              }
            });

            if (pendingList.length > 0) setUpcoming(pendingList);
            if (completedList.length > 0) setRecent(completedList);
          }
        }
      } catch (err) {
        console.error("Error fetching parent assignments:", err);
      }
    };

    fetchParentAssignments();
  }, [user]);

  const handleOpenAssign = (childId?: string) => {
    if (children.length === 0) {
      toast.info("Please add a child account first in 'My Children'.");
      return;
    }
    const target = children.find((c) => c.id === childId) || children[0];
    setAssignTargetChild(target);
    setAssignOpen(true);
  };

  // Unique list of subjects and students for filter pills
  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    [...needsAttention, ...upcoming, ...recent].forEach((a) => set.add(a.subject));
    return Array.from(set);
  }, [needsAttention, upcoming, recent]);

  const allStudentNames = useMemo(() => {
    const set = new Set<string>();
    [...needsAttention, ...upcoming, ...recent].forEach((a) => set.add(a.child));
    return Array.from(set);
  }, [needsAttention, upcoming, recent]);

  const matchesFilter = (item: AssignmentDisplay) => {
    if (selectedStudentFilter !== "all" && item.child !== selectedStudentFilter) return false;
    if (selectedSubjectFilter !== "all" && item.subject !== selectedSubjectFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.child.toLowerCase().includes(q)
      );
    }
    return true;
  };

  const filteredAttention = needsAttention.filter(matchesFilter);
  const filteredUpcoming = upcoming.filter(matchesFilter);
  const filteredRecent = recent.filter(matchesFilter);

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header section with unified school/student typography */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2d4b68] bg-[#0c2438] px-3 py-1 text-[11px] font-semibold text-[#58c4e8]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Academic Management</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#71c9ed]">
            Assignments Manager<span className="text-[#3bc2f3]">.</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Track, assign customized practice drills, and monitor student completion rates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleOpenAssign()}
            className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs sm:text-sm"
          >
            <BookOpen className="mr-1.5 h-4 w-4" />
            Assign Practice
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by topic, subject, or child..."
            className="h-10 pl-10 rounded-xl border border-[#26344d] bg-[#0d162a] text-xs sm:text-sm text-slate-200 placeholder:text-slate-400 focus:border-[#3bc2f3]/60 focus:ring-1 focus:ring-[#3bc2f3]/20"
          />
        </div>

        {/* Student Filter */}
        <select
          aria-label="Filter by student"
          value={selectedStudentFilter}
          onChange={(e) => setSelectedStudentFilter(e.target.value)}
          className="h-10 rounded-xl border border-[#26344d] bg-[#0d162a] px-3 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-[#3bc2f3]"
        >
          <option value="all">All Children</option>
          {allStudentNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* Subject Filter */}
        <select
          aria-label="Filter by subject"
          value={selectedSubjectFilter}
          onChange={(e) => setSelectedSubjectFilter(e.target.value)}
          className="h-10 rounded-xl border border-[#26344d] bg-[#0d162a] px-3 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-[#3bc2f3]"
        >
          <option value="all">All Subjects</option>
          {allSubjects.map((sub) => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>
      </div>

      {/* Grid: Main Tasks & Summaries */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6 sm:space-y-8">
          {/* Needs Attention / Overdue */}
          {filteredAttention.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#71c9ed]">Needs Attention</h2>
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-400 border border-rose-500/30">
                  {filteredAttention.length}
                </span>
              </div>

              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {filteredAttention.map((item) => (
                  <Card
                    key={item.id}
                    className="border border-[#4c1d24] bg-[#170e17] text-slate-100 hover:border-[#6f2935] transition-colors rounded-2xl"
                  >
                    <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/30">
                            {item.status}
                          </span>
                          <span className="text-xs text-slate-400">{item.due}</span>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-[#71c9ed] leading-snug">
                          {item.title}
                        </h3>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                          <span className="font-semibold text-slate-200">{item.child}</span>
                          <span>•</span>
                          <span className="text-[#58c4e8]">{item.subject}</span>
                          {item.questions && (
                            <>
                              <span>•</span>
                              <span>{item.questions} Qs</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#3b171d] flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => toast.success(`Reminder notification sent to ${item.child}!`)}
                          className="flex-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-semibold"
                        >
                          Remind Child
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssign(item.childId)}
                          className="border-[#384c6e] bg-[#0c1628] text-slate-300 hover:text-white text-xs"
                        >
                          Reassign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming & Active */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-[#58c4e8]" />
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#71c9ed]">Active &amp; Upcoming</h2>
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-[#58c4e8] border border-sky-500/30">
                  {filteredUpcoming.length}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {filteredUpcoming.map((item) => (
                <Card
                  key={item.id}
                  className="border border-[#233148] bg-[#0c1628] text-slate-100 hover:border-[#384c6e] transition-colors rounded-2xl"
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-300 border border-sky-500/30">
                          {item.status}
                        </span>
                        <span className="text-xs text-slate-400">{item.due}</span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-[#71c9ed] leading-snug">
                        {item.title}
                      </h3>

                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">{item.child}</span>
                        <span>•</span>
                        <span className="text-[#58c4e8]">{item.subject}</span>
                        {item.questions && (
                          <>
                            <span>•</span>
                            <span>{item.questions} Qs</span>
                          </>
                        )}
                        {item.duration && (
                          <>
                            <span>•</span>
                            <span>{item.duration} Mins</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#1e2c45]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssign(item.childId)}
                        className="w-full border-slate-700 bg-slate-900/60 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        View Assignment Details
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar panels: Recent activity & Completed highlights */}
        <div className="space-y-6">
          <Card className="border border-[#233148] bg-[#0c1628] text-slate-100 rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e2c45] pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-[#71c9ed]">Recently Completed</h3>
                </div>
                <span className="text-xs text-slate-400">{filteredRecent.length} tasks</span>
              </div>

              <div className="space-y-3">
                {filteredRecent.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#202b43] bg-[#080f22] p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                        Completed
                      </span>
                      <span className="text-[11px] text-slate-400">{item.due}</span>
                    </div>

                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-slate-400">
                      <span className="font-medium text-slate-300">{item.child}</span> · {item.subject}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Mastery Tip */}
          <Card className="border border-[#233148] bg-[#0c1628] text-slate-100 rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#58c4e8]">
                <Sparkles className="h-5 w-5" />
                <h4 className="text-sm font-bold text-[#71c9ed]">Parent Tip for BECE &amp; NCEE</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Short 15-question daily practice sessions yield 3x higher retention than weekend cramming. Target specific weak topics identified in your child's Performance Reports.
              </p>
              <Button
                size="sm"
                onClick={() => handleOpenAssign()}
                className="w-full bg-[#17263c] hover:bg-[#203450] text-[#58c4e8] border border-[#264462] text-xs font-semibold mt-2"
              >
                Create Target Drill
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Dialog */}
      {assignTargetChild && (
        <AssignPracticeDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          child={assignTargetChild}
        />
      )}
    </div>
  );
}
