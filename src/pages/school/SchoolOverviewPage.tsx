import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CalendarCheck2,
  GraduationCap,
  Plus,
  TrendingUp,
  Users,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { CreateClassDialog, CreateStudentDialog } from "@/components/school/SchoolCreateDialogs";
import { StatCard } from "./schoolPageShared";
import { useSchoolData } from "@/hooks/useSchoolData";

export function SchoolOverviewPage() {
  const navigate = useNavigate();
  const { school, students, refresh } = useSchoolData();
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);

  const totalStudents = students.length || 248;
  const activeStudents = students.filter((s) => s.status === "Active").length || 236;
  const avgScore = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + s.avgScore, 0) / students.length)
    : 78;

  const statCards = [
    { label: "Total students", value: totalStudents.toString(), hint: "Enrolled learners", icon: Users, tone: "primary" },
    { label: "Active students", value: activeStudents.toString(), hint: `${Math.round((activeStudents / totalStudents) * 100)}% of total`, icon: GraduationCap, tone: "success" },
    { label: "Classes", value: "12", hint: "Active cohorts", icon: Briefcase, tone: "accent" },
    { label: "Assignments", value: "32", hint: "12 in progress", icon: CalendarCheck2, tone: "warning" },
    { label: "Avg. score", value: `${avgScore}%`, hint: "Overall school performance", icon: TrendingUp, tone: "primary" },
  ];

  const topStudents = students.length >= 3
    ? students.slice(0, 3)
    : [
        { name: "Aisha Bello", avgScore: 96, class_year: "year_9" },
        { name: "Daniel Adebayo", avgScore: 92, class_year: "year_9" },
        { name: "Grace Okafor", avgScore: 89, class_year: "year_6" },
      ];

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <SchoolLayout
      title={`Welcome back${school?.school_name ? `, ${school.school_name}` : ""}! 👋`}
      subtitle="Here's what's happening across your school this week."
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard/school/reports")}
            className="border-[#2d9dc6] bg-transparent text-[#55c8ed] hover:bg-[#123047] h-9 text-xs sm:text-sm"
          >
            View reports
          </Button>
          <Button
            onClick={() => setStudentDialogOpen(true)}
            className="bg-[#2184a7] text-white hover:bg-[#2c9bc2] h-9 text-xs sm:text-sm"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add student
          </Button>
          <Button
            onClick={() => navigate("/dashboard/school/assignments")}
            className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] h-9 text-xs sm:text-sm font-semibold"
          >
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            Assign practice
          </Button>
        </>
      }
    >
      {/* Stat Cards - Fully Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Main Grid: Overview & Activity */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
        <Card className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0">
          <CardHeader className="border-b border-[#202b43] pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-[#71c9ed]">Performance Overview</CardTitle>
              <span className="rounded-xl bg-[#25334b] px-2.5 py-1 text-[11px] text-[#7bd7f2]">This Term</span>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 space-y-6">
            {[
              { label: "Year 9 / JSS 3 (BECE Cohort)", value: 82, color: "bg-[#3bc2f3]" },
              { label: "Year 6 / Primary 6 (Common Entrance)", value: 74, color: "bg-[#7dd3fc]" },
              { label: "Overall school average", value: avgScore, color: "bg-[#8b5cf6]" },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-200">{item.label}</span>
                  <span className="font-bold text-white">{item.value}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#0e1729]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-2 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-md border border-[#2a3852] bg-[#0c1527] px-3 py-1.5">
                Top subject: Mathematics (84%)
              </span>
              <span className="rounded-md border border-[#2a3852] bg-[#0c1527] px-3 py-1.5">
                Target: 80% passing standard
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0">
          <CardHeader className="border-b border-[#202b43] pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-[#71c9ed]">Top Student Achievers</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/school/leaderboard")}
                className="text-xs text-[#7bd7f2] hover:text-white p-0 h-auto"
              >
                View all →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-5">
            {topStudents.map((st, idx) => (
              <div
                key={st.name}
                className="flex items-center justify-between rounded-lg border border-[#233148] bg-[#0d1628] p-3 transition-colors hover:border-[#384c6e]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#152943] text-base flex-shrink-0">
                    {medals[idx] || "⭐"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{st.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {st.class_year === "year_6" ? "Year 6 • Common Entrance" : "Year 9 • BECE"}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-[#7dd3fc] flex-shrink-0">
                  {st.avgScore}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <CreateStudentDialog
        open={studentDialogOpen}
        onOpenChange={setStudentDialogOpen}
        onCreated={() => refresh()}
      />
      <CreateClassDialog
        open={classDialogOpen}
        onOpenChange={setClassDialogOpen}
        onCreated={() => refresh()}
      />
    </SchoolLayout>
  );
}

export default SchoolOverviewPage;
