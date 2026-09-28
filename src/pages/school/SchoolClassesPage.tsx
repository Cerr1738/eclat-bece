import { useEffect, useState, useMemo } from "react";
import { Building2, Plus, Search, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { CreateClassDialog } from "@/components/school/SchoolCreateDialogs";
import { supabase } from "@/integrations/supabase/client";

interface ClassItem {
  id?: string;
  name: string;
  level: string;
  teacher?: string | null;
  studentsCount: number;
  avgScore: string;
  badge?: string;
  subjects: string[];
}

const defaultClasses: ClassItem[] = [
  {
    name: "Year 9 / JSS 3",
    level: "JSS 3",
    badge: "BECE Cohort",
    studentsCount: 142,
    avgScore: "82%",
    subjects: ["Mathematics", "English", "Basic Science", "Social Studies"],
    teacher: "Mrs. Sarah Johnson",
  },
  {
    name: "Year 6 / Primary 6",
    level: "Primary 6",
    badge: "Common Entrance",
    studentsCount: 106,
    avgScore: "74%",
    subjects: ["Mathematics", "English", "General Science", "Quantitative"],
    teacher: "Mr. Chukwuma Okafor",
  },
];

export function SchoolClassesPage() {
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [createdClasses, setCreatedClasses] = useState<ClassItem[]>([]);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const loadClasses = async () => {
    try {
      const { data } = await supabase
        .from("school_classes" as never)
        .select("id, name, level, lead_teacher, student_count, average_score")
        .order("created_at", { ascending: false } as never) as {
        data: Array<{
          id: string;
          name: string;
          level: string;
          lead_teacher: string | null;
          student_count: number;
          average_score: number;
        }> | null;
      };

      if (data && data.length > 0) {
        setCreatedClasses(
          data.map((item) => ({
            id: item.id,
            name: item.name,
            level: item.level,
            teacher: item.lead_teacher,
            studentsCount: item.student_count || 0,
            avgScore: item.average_score > 0 ? `${item.average_score}%` : "—",
            badge: "Active Class",
            subjects: ["General Curriculum"],
          }))
        );
      }
    } catch (err) {
      console.error("Error loading classes:", err);
    }
  };

  useEffect(() => {
    void loadClasses();
  }, []);

  const allClasses = useMemo(() => {
    return [...defaultClasses, ...createdClasses];
  }, [createdClasses]);

  const filteredClasses = useMemo(() => {
    return allClasses.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.level.toLowerCase().includes(search.toLowerCase()) ||
        (c.teacher && c.teacher.toLowerCase().includes(search.toLowerCase()));

      const matchesLevel =
        levelFilter === "all" || c.level.toLowerCase().includes(levelFilter.toLowerCase());

      return matchesSearch && matchesLevel;
    });
  }, [allClasses, search, levelFilter]);

  const totalClassesCount = allClasses.length;
  const totalStudents = allClasses.reduce((acc, c) => acc + c.studentsCount, 0);

  return (
    <SchoolLayout
      title="Classes & Cohorts"
      subtitle="Manage examination cohorts, class streams, and assigned faculty."
      actions={
        <Button
          onClick={() => setClassDialogOpen(true)}
          className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs sm:text-sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add class
        </Button>
      }
    >
      {/* Metric Cards */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          ["Total classes", totalClassesCount.toString(), "Active cohorts"],
          ["Total learners", totalStudents.toString(), "Across all levels"],
          ["BECE Candidates", "142", "Year 9 students"],
          ["Primary 6 Candidates", "106", "Common Entrance"],
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

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-[#2a3852] bg-[#0f182b] p-3 text-xs">
        <div className="flex items-center gap-2 flex-1 rounded-lg border border-[#34415b] bg-[#071023] px-3 py-2 text-slate-200">
          <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes by name, level or teacher..."
            className="w-full bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-lg border border-[#34415b] bg-[#071023] px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Levels</option>
            <option value="jss 3">JSS 3 (Year 9)</option>
            <option value="primary 6">Primary 6 (Year 6)</option>
            <option value="jss">All JSS</option>
          </select>
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredClasses.map((klass) => (
          <Card
            key={klass.name}
            className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0 hover:border-[#384c6e] transition-colors flex flex-col justify-between"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg font-bold text-[#71c9ed] leading-tight">
                  {klass.name}
                </CardTitle>
                <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-300 flex-shrink-0">
                  {klass.badge || klass.level}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Lead: {klass.teacher || "Unassigned"}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-slate-700/60 bg-[#0c1424] p-2.5">
                  <p className="text-slate-400 text-[11px]">Students</p>
                  <p className="mt-1 text-xl font-black text-white">{klass.studentsCount}</p>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-[#0c1424] p-2.5">
                  <p className="text-slate-400 text-[11px]">Avg Score</p>
                  <p className="mt-1 text-xl font-black text-[#7dd3fc]">{klass.avgScore}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {klass.subjects.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-300"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateClassDialog
        open={classDialogOpen}
        onOpenChange={setClassDialogOpen}
        onCreated={() => void loadClasses()}
      />
    </SchoolLayout>
  );
}

export default SchoolClassesPage;
