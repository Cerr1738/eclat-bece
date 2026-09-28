import { useState, useMemo } from "react";
import { Users, Search, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { CreateStudentDialog } from "@/components/school/SchoolCreateDialogs";
import { useSchoolData } from "@/hooks/useSchoolData";

const fallbackStudents = [
  { name: "Ayo Johnson", id: "STU-00123", cohort: "Year 9 (JSS 3)", score: "85%", status: "Active" },
  { name: "Blessing Adeyemi", id: "STU-00124", cohort: "Year 9 (JSS 3)", score: "90%", status: "Active" },
  { name: "Chiamaka Okafor", id: "STU-00125", cohort: "Year 6 (Primary 6)", score: "78%", status: "Active" },
  { name: "Daniel Adeboye", id: "STU-00126", cohort: "Year 9 (JSS 3)", score: "72%", status: "Active" },
  { name: "Emeka Nwosu", id: "STU-00127", cohort: "Year 6 (Primary 6)", score: "64%", status: "Active" },
];

export function SchoolStudentsPage() {
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { students, refresh, isLoading } = useSchoolData();

  // Combine real students with fallback if empty
  const displayStudents = useMemo(() => {
    if (students.length > 0) {
      return students.map((s) => ({
        name: s.name,
        id: s.unique_id || s.id.slice(0, 8),
        cohort: s.class_year === "year_6" ? "Year 6 (Primary 6)" : "Year 9 (JSS 3)",
        score: s.quizCount > 0 ? `${s.avgScore}%` : "—",
        status: s.status,
      }));
    }
    return fallbackStudents;
  }, [students]);

  const filteredStudents = useMemo(() => {
    return displayStudents.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.cohort.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass =
        classFilter === "all" ||
        (classFilter === "year_6" && student.cohort.includes("Year 6")) ||
        (classFilter === "year_9" && student.cohort.includes("Year 9"));

      const matchesStatus =
        statusFilter === "all" || student.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [displayStudents, searchQuery, classFilter, statusFilter]);

  const totalCount = displayStudents.length;
  const activeCount = displayStudents.filter((s) => s.status === "Active").length;

  return (
    <SchoolLayout
      title="Students"
      subtitle="Review active learners, class cohorts, and performance records."
      actions={
        <Button
          onClick={() => setStudentDialogOpen(true)}
          className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs sm:text-sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add student
        </Button>
      }
    >
      {/* Metric Cards */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          ["Total students", totalCount.toString(), "Enrolled learners"],
          ["Active students", activeCount.toString(), `${Math.round((activeCount / totalCount) * 100)}% active`],
          ["Year 9 (JSS 3)", displayStudents.filter((s) => s.cohort.includes("Year 9")).length.toString(), "BECE candidates"],
          ["Year 6 (Primary 6)", displayStudents.filter((s) => s.cohort.includes("Year 6")).length.toString(), "Common entrance"],
        ].map(([label, value, hint]) => (
          <Card key={label} className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0">
            <CardContent className="p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 truncate">
                {label}
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-white truncate">{value}</p>
              <p className="mt-1 text-[11px] text-[#51c6eb] truncate">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-[#2a3852] bg-[#0f182b] overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#2a3852] p-4 text-xs">
          <div className="flex items-center gap-2 flex-1 rounded-lg border border-[#34415b] bg-[#071023] px-3 py-2 text-slate-200">
            <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, ID or cohort..."
              className="w-full bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-lg border border-[#34415b] bg-[#071023] px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Cohorts</option>
              <option value="year_9">Year 9 (BECE)</option>
              <option value="year_6">Year 6 (Common Entrance)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#34415b] bg-[#071023] px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Scrollable Table to Prevent Screen Blowout */}
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1fr_0.8fr] border-b border-[#2a3852] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 bg-[#0c1424]">
              <span>Student</span>
              <span>Student ID</span>
              <span>Class / Cohort</span>
              <span>Status</span>
              <span className="text-right">Avg Score</span>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No students match your filter criteria.
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="grid grid-cols-[1.5fr_1fr_1.2fr_1fr_0.8fr] items-center border-b border-[#202b43] px-4 py-3 text-xs text-slate-200 hover:bg-[#15233c]/60 transition-colors"
                >
                  <span className="font-semibold text-white truncate">{student.name}</span>
                  <span className="font-mono text-slate-400 text-[11px] truncate">{student.id}</span>
                  <span className="text-slate-300 truncate">{student.cohort}</span>
                  <span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        student.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      • {student.status}
                    </span>
                  </span>
                  <span className="text-right font-bold text-white">{student.score}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer pagination info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 text-[11px] text-slate-400 border-t border-[#2a3852]">
          <span>
            Showing {filteredStudents.length} of {displayStudents.length} students
          </span>
          <span className="text-slate-300">Page 1 of 1</span>
        </div>
      </div>

      <CreateStudentDialog
        open={studentDialogOpen}
        onOpenChange={setStudentDialogOpen}
        onCreated={() => refresh()}
      />
    </SchoolLayout>
  );
}

export default SchoolStudentsPage;
