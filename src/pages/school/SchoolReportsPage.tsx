import { useState } from "react";
import { ChartColumnBig, BarChart3, TrendingUp, Award, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { ClassAnalyticsDialog, AnalyticsQuizResult } from "@/components/ClassAnalyticsDialog";
import { useSchoolData } from "@/hooks/useSchoolData";
import { toast } from "sonner";

export function SchoolReportsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "subjects" | "cohorts">("overview");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsCohort, setAnalyticsCohort] = useState<"Year 9 (BECE)" | "Year 6 (Common Entrance)">("Year 9 (BECE)");

  const { students } = useSchoolData();

  const handleExportCSV = () => {
    toast.success("School performance report prepared for download!");
  };

  const analyticsStudents = students.map((s) => ({
    id: s.id,
    name: s.name,
    avatar: "🎓",
  }));

  return (
    <SchoolLayout
      title="Reports & Analytics"
      subtitle="Track institutional performance, subject proficiencies, and cohort benchmarks."
      actions={
        <>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 text-xs sm:text-sm"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            onClick={() => {
              setAnalyticsCohort("Year 9 (BECE)");
              setAnalyticsOpen(true);
            }}
            className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs sm:text-sm"
          >
            <ChartColumnBig className="mr-1.5 h-4 w-4" />
            Detailed analytics
          </Button>
        </>
      }
    >
      {/* Tab Navigation */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[#26344d] pb-3 text-xs">
        {[
          { key: "overview", label: "Executive Overview" },
          { key: "subjects", label: "Subject Breakdown" },
          { key: "cohorts", label: "Cohort Comparisons" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-[#2184a7] text-white"
                : "text-slate-400 hover:text-white hover:bg-[#15233c]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: "Cohort Average", value: "78%", hint: "↑ 4.2% from last term", tone: "text-[#66d7ff]" },
          { label: "Math Mastery", value: "81%", hint: "Highest performing subject", tone: "text-[#48d7b7]" },
          { label: "English Fluency", value: "75%", hint: "8% comprehension gain", tone: "text-[#c4a9ff]" },
          { label: "Assignment Completion", value: "92%", hint: "228 of 248 learners", tone: "text-[#ffca6a]" },
        ].map((item) => (
          <Card key={item.label} className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0">
            <CardContent className="p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 truncate">
                {item.label}
              </p>
              <p className={`mt-2 text-2xl sm:text-3xl font-black ${item.tone} truncate`}>
                {item.value}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 truncate">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Content Panels */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0">
            <CardHeader className="border-b border-[#202b43] pb-3">
              <CardTitle className="text-base font-semibold text-[#71c9ed]">Subject Proficiencies</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {[
                { subject: "Mathematics", score: 81, target: 80 },
                { subject: "English Language", score: 75, target: 75 },
                { subject: "Basic Science", score: 79, target: 75 },
                { subject: "Social Studies", score: 73, target: 70 },
              ].map((sub) => (
                <div key={sub.subject} className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-slate-200">{sub.subject}</span>
                    <span className="font-bold text-white">{sub.score}% (Target: {sub.target}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#0a1426] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full"
                      style={{ width: `${sub.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0">
            <CardHeader className="border-b border-[#202b43] pb-3">
              <CardTitle className="text-base font-semibold text-[#71c9ed]">BECE Readiness Index</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-sky-300 font-semibold uppercase tracking-wider">Projected Distinction Rate</span>
                  <span className="text-xl font-black text-sky-400">84%</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Based on mock exams and past question drills, 84% of candidates in Year 9 are trending toward A & B grades in core subjects.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-[#2a3852] bg-[#0c1424] text-xs">
                <span className="text-slate-300">Target interventions recommended:</span>
                <span className="font-bold text-amber-400">14 learners</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "subjects" && (
        <Card className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0">
          <CardHeader className="border-b border-[#202b43] pb-3">
            <CardTitle className="text-base font-semibold text-[#71c9ed]">Curriculum Topic Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Algebra & Equations", cohort: "JSS 3", mastery: "88%", badge: "Strong" },
                { title: "Geometry & Shapes", cohort: "JSS 3", mastery: "68%", badge: "Needs Drill" },
                { title: "Grammar & Clauses", cohort: "JSS 3", mastery: "79%", badge: "Good" },
                { title: "Comprehension Passages", cohort: "JSS 3", mastery: "72%", badge: "Moderate" },
                { title: "Energy & Matter", cohort: "JSS 3", mastery: "82%", badge: "Strong" },
                { title: "Fractions & Percentages", cohort: "Primary 6", mastery: "76%", badge: "Good" },
              ].map((topic) => (
                <div key={topic.title} className="p-3.5 rounded-lg border border-[#233148] bg-[#0c1424] space-y-2">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-white text-xs">{topic.title}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                      {topic.badge}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{topic.cohort}</span>
                    <span className="font-bold text-white">{topic.mastery}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "cohorts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[#71c9ed]">Year 9 (BECE Cohort)</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs text-slate-300">
              <div className="flex justify-between border-b border-[#233148] pb-2">
                <span>Enrolled Candidates:</span>
                <span className="font-bold text-white">142</span>
              </div>
              <div className="flex justify-between border-b border-[#233148] pb-2">
                <span>Completed Mock Quizzes:</span>
                <span className="font-bold text-[#58c4e8]">1,280 sessions</span>
              </div>
              <div className="flex justify-between">
                <span>Benchmark Score:</span>
                <span className="font-bold text-emerald-400">82%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[#71c9ed]">Year 6 (Common Entrance)</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs text-slate-300">
              <div className="flex justify-between border-b border-[#233148] pb-2">
                <span>Enrolled Candidates:</span>
                <span className="font-bold text-white">106</span>
              </div>
              <div className="flex justify-between border-b border-[#233148] pb-2">
                <span>Completed Mock Quizzes:</span>
                <span className="font-bold text-[#58c4e8]">840 sessions</span>
              </div>
              <div className="flex justify-between">
                <span>Benchmark Score:</span>
                <span className="font-bold text-emerald-400">74%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ClassAnalyticsDialog
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        className={analyticsCohort}
        students={analyticsStudents}
      />
    </SchoolLayout>
  );
}

export default SchoolReportsPage;
