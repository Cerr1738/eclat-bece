import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Calendar, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { SectionHeader } from "./schoolPageShared";
import { SchoolAssignPracticeDialog } from "@/components/school/SchoolAssignPracticeDialog";
import { useSchoolData } from "@/hooks/useSchoolData";
import { supabase } from "@/integrations/supabase/client";

interface AssignmentItem {
  id: string;
  title: string;
  cohort: string;
  subject: string;
  questions: number;
  timeLimit: number;
  due: string;
  status: "Pending" | "In Progress" | "Completed";
}

const fallbackAssignments: AssignmentItem[] = [
  { id: "1", title: "Fractions & Decimals Practice", cohort: "Year 6 (Primary 6)", subject: "Mathematics", questions: 15, timeLimit: 25, due: "Due in 2 days", status: "In Progress" },
  { id: "2", title: "BECE English Grammar Revision", cohort: "Year 9 (JSS 3)", subject: "English Language", questions: 20, timeLimit: 30, due: "Due tomorrow", status: "In Progress" },
  { id: "3", title: "Basic Science Living Things Test", cohort: "Year 9 (JSS 3)", subject: "Basic Science", questions: 15, timeLimit: 20, due: "Due in 5 days", status: "Pending" },
  { id: "4", title: "Quantitative Aptitude Mock", cohort: "Year 6 (Primary 6)", subject: "Mathematics", questions: 25, timeLimit: 35, due: "Completed yesterday", status: "Completed" },
];

export function SchoolAssignmentsPage() {
  const [assignOpen, setAssignOpen] = useState(false);
  const { school, students, refresh } = useSchoolData();
  const [assignments, setAssignments] = useState<AssignmentItem[]>(fallbackAssignments);
  const [isLoading, setIsLoading] = useState(false);

  const loadAssignments = useCallback(async () => {
    if (!school?.id) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("practice_assignments")
        .select(`
          id,
          subject,
          student_id,
          num_questions,
          duration,
          status,
          created_at,
          topics,
          students (
            class_year
          )
        `)
        .eq("school_id", school.id)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const studentMap = new Map(students.map((s) => [s.id, s]));
        const formatted: AssignmentItem[] = data.map((item) => {
          const topics = Array.isArray(item.topics) ? item.topics.join(", ") : "";
          const studentRel = Array.isArray(item.students) ? item.students[0] : item.students;
          const classYear = studentRel?.class_year || studentMap.get(item.student_id)?.class_year;

          let statusText: "Pending" | "In Progress" | "Completed" = "In Progress";
          if (item.status === "completed") {
            statusText = "Completed";
          } else if (item.status === "pending") {
            statusText = "Pending";
          }

          return {
            id: item.id,
            title: topics ? `${item.subject} (${topics})` : `${item.subject} Assignment`,
            cohort: classYear === "year_6" ? "Year 6 (Primary 6)" : classYear === "year_9" ? "Year 9 (JSS 3)" : "General",
            subject: item.subject,
            questions: item.num_questions || 15,
            timeLimit: item.duration || 30,
            due: "Active",
            status: statusText,
          };
        });
        setAssignments(formatted);
      }
    } catch (err) {
      console.error("Error loading assignments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [school?.id, students]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const studentOptions = students.map((s) => ({
    id: s.id,
    name: s.name,
    class_year: s.class_year,
  }));

  return (
    <SchoolLayout
      title="Assignments"
      subtitle="Assign customized practice quizzes and track student completion rates."
      actions={
        <Button
          onClick={() => setAssignOpen(true)}
          className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs sm:text-sm"
        >
          <BookOpen className="mr-1.5 h-4 w-4" />
          Assign practice
        </Button>
      }
    >
      <SectionHeader
        title="Active Assignments"
        subtitle="Quizzes and timed practice sessions assigned to classes and learners"
      />

      {/* Assignments List */}
      <div className="space-y-3 sm:space-y-4">
        {assignments.map((assignment) => (
          <Card
            key={assignment.id}
            className="border border-[#233148] bg-[#0c1628] text-slate-100 min-w-0 hover:border-[#384c6e] transition-colors"
          >
            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base sm:text-lg font-bold text-white truncate">
                    {assignment.title}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                      assignment.status === "Completed"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : assignment.status === "In Progress"
                        ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {assignment.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="text-[#58c4e8] font-medium">{assignment.cohort}</span>
                  <span>•</span>
                  <span>{assignment.questions} Questions</span>
                  <span>•</span>
                  <span>{assignment.timeLimit} Mins</span>
                  <span>•</span>
                  <span>{assignment.due}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 bg-slate-900/60 text-xs text-slate-200 hover:bg-slate-800"
                >
                  View submissions
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignment Dialog */}
      {school && (
        <SchoolAssignPracticeDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          schoolId={school.id}
          students={studentOptions}
          onSuccess={() => {
            loadAssignments();
            refresh();
          }}
        />
      )}
    </SchoolLayout>
  );
}

export default SchoolAssignmentsPage;
