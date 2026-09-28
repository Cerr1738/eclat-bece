import { useState } from "react";
import { ArrowDownToLine, BarChart3, CheckCircle2, ChevronDown, CircleAlert, Download, Search, Sparkles, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const subjectScores = [
  { subject: "Mathematics", value: 92, delta: "Class Avg: 78%" },
  { subject: "English Language", value: 85, delta: "Class Avg: 81%" },
  { subject: "Basic Science", value: 76, delta: "Class Avg: 82%" },
  { subject: "Social Studies", value: 88, delta: "Class Avg: 75%" },
];

const sparkLine = [68, 72, 76, 80, 79, 83, 86, 90, 88, 92];

export default function ParentReportsPage() {
  const [termFilter, setTermFilter] = useState("term1");

  const handleExportPDF = () => {
    toast.success("Generating report card PDF...", {
      description: "Your report download will begin in a moment.",
    });
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2d4b68] bg-[#0c2438] px-3 py-1 text-[11px] font-semibold text-[#58c4e8]">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Academic Performance</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#71c9ed]">
            Performance Reports<span className="text-[#3bc2f3]">.</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Comprehensive diagnostic scores, syllabus milestones, and mock exam progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            aria-label="Filter reports by term"
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            className="h-9 sm:h-10 rounded-xl border border-[#26344d] bg-[#0d162a] px-3 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-[#3bc2f3]"
          >
            <option value="term1">First Term (2025/2026)</option>
            <option value="term2">Second Term (2025/2026)</option>
            <option value="all">Cumulative Year</option>
          </select>
          <Button
            onClick={handleExportPDF}
            className="h-9 sm:h-10 bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs sm:text-sm rounded-xl"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 p-4 sm:p-5 hover:border-[#384c6e] transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Overall Score</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">84%</span>
            <span className="text-xs font-bold text-emerald-400">+3% this month</span>
          </div>
          <p className="mt-1 text-xs text-[#58c4e8]">Top 15% in cohort</p>
        </Card>

        <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 p-4 sm:p-5 hover:border-[#384c6e] transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Assignments Done</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">42</span>
            <span className="text-xs text-slate-400">/ 45 completed</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#080f22]">
            <div className="h-full rounded-full bg-[#3bc2f3]" style={{ width: "93%" }} />
          </div>
        </Card>

        <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 p-4 sm:p-5 hover:border-[#384c6e] transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active Streak</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">12</span>
            <span className="text-xs text-amber-400/80">Consecutive Days</span>
          </div>
          <p className="mt-1 text-xs text-amber-400">★ Personal best record!</p>
        </Card>

        <Card className="rounded-2xl border border-[#4c1d24] bg-[#170e17] text-slate-100 p-4 sm:p-5 hover:border-[#6f2935] transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">Areas of Concern</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-400">2</span>
            <span className="text-xs text-rose-300/80">Topics identified</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-400">
            <CircleAlert className="h-3.5 w-3.5" />
            <span>Target drills suggested</span>
          </div>
        </Card>
      </div>

      {/* Main Breakdown: Trend + Subject Mastery */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Trend Over Time */}
        <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1e2c45] pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#71c9ed]">Score Trend Over Time</h2>
                <p className="text-xs text-slate-400">10 most recent quiz sessions</p>
              </div>
              <div className="flex items-center gap-1.5 bg-[#080f22] border border-[#202b43] p-1 rounded-xl">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#0c2438] text-[#58c4e8]">Trend</span>
                <span className="px-2.5 py-1 text-xs font-semibold text-slate-400">Bi-Weekly</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#202b43] bg-[#080f22] p-4 sm:p-5">
              <div className="flex h-52 items-end gap-2 sm:gap-3">
                {sparkLine.map((val, idx) => (
                  <div key={idx} className="flex flex-1 flex-col items-center justify-end gap-1.5 h-full">
                    <span className="text-[10px] font-bold text-slate-300">{val}%</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-[#0c9dcc]/30 via-[#3bc2f3] to-[#58c4e8] transition-all hover:opacity-90"
                      style={{ height: `${val * 1.8}px` }}
                    />
                    <span className="text-[10px] font-medium text-slate-400">#{idx + 1}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400 pt-3 border-t border-[#1e2c45]">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#3bc2f3]" /> Student&apos;s Score
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full border border-slate-500" /> Benchmark (75%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subject Mastery List */}
        <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2c45] pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#71c9ed]">Subject Mastery</h2>
                <p className="text-xs text-slate-400">Core examination requirements</p>
              </div>
              <span className="rounded-full bg-[#0c2438] border border-[#2d4b68] px-2.5 py-0.5 text-[10px] font-bold text-[#58c4e8]">
                Term 1
              </span>
            </div>

            <div className="space-y-4 pt-1">
              {subjectScores.map((item) => (
                <div key={item.subject} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-white">
                    <span>{item.subject}</span>
                    <span className="text-[#58c4e8]">{item.value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#080f22]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0c9dcc] to-[#3bc2f3]"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{item.delta}</span>
                    <span className={item.value >= 80 ? "text-emerald-400" : "text-amber-400"}>
                      {item.value >= 80 ? "Strong" : "Average"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="mt-2 w-full rounded-xl border-slate-700 bg-slate-900/60 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              View Full Topic Breakdown
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assessment Modules */}
      <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#1e2c45] pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#71c9ed]">Recent Assessments</h2>
              <p className="text-xs text-slate-400">Graded timed simulations and mock assignments</p>
            </div>
            <button
              onClick={handleExportPDF}
              className="text-xs font-semibold text-[#58c4e8] hover:text-white flex items-center gap-1 self-start sm:self-center"
            >
              <Download className="h-3.5 w-3.5" /> Download all results
            </button>
          </div>

          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            {[
              { title: "Algebra Diagnostic Mock", status: "Mastered", score: "91%", subject: "Mathematics", date: "2 days ago" },
              { title: "Reading Comprehension Drill", status: "Needs Practice", score: "68%", subject: "English Language", date: "4 days ago" },
              { title: "Living Things & Habitat Quiz", status: "Strong", score: "88%", subject: "Basic Science", date: "1 week ago" },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#202b43] bg-[#080f22] p-4 flex flex-col justify-between hover:border-[#384c6e] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      item.status === "Mastered"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : item.status === "Strong"
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-[11px] text-slate-400">{item.date}</span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#71c9ed] leading-snug">{item.title}</h3>
                  <p className="mt-1 text-xs text-[#58c4e8]">{item.subject}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1e2c45] flex items-center justify-between">
                  <span className="text-xs text-slate-400">Score</span>
                  <span className="text-lg font-black text-white">{item.score}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
