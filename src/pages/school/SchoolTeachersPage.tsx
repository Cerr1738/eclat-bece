import { useState } from "react";
import { Briefcase, Search, Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { toast } from "sonner";

interface Teacher {
  name: string;
  role: string;
  department: string;
  load: string;
  email: string;
  classesCount: number;
}

const teachersData: Teacher[] = [
  { name: "Mrs. Sarah Johnson", role: "Lead Teacher", department: "Mathematics", load: "83%", email: "s.johnson@school.edu", classesCount: 4 },
  { name: "Mr. Chukwuma Okafor", role: "Senior Instructor", department: "English Language", load: "76%", email: "c.okafor@school.edu", classesCount: 3 },
  { name: "Miss Fatima Ali", role: "Science Specialist", department: "Basic Science", load: "91%", email: "f.ali@school.edu", classesCount: 5 },
  { name: "Mr. David Adeleke", role: "Humanities Teacher", department: "Social Studies", load: "70%", email: "d.adeleke@school.edu", classesCount: 3 },
];

export function SchoolTeachersPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");

  const filteredTeachers = teachersData.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = department === "all" || t.department.toLowerCase() === department.toLowerCase();
    return matchesSearch && matchesDept;
  });

  return (
    <SchoolLayout
      title="Teacher Directory"
      subtitle="Manage faculty profiles, department assignments, and class allocations."
      actions={
        <Button
          onClick={() => toast.info("Teacher invitation feature will be available soon.")}
          className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs sm:text-sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add teacher
        </Button>
      }
    >
      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-[#2a3852] bg-[#0f182b] p-3 text-xs">
        <div className="flex items-center gap-2 flex-1 rounded-lg border border-[#34415b] bg-[#071023] px-3 py-2 text-slate-200">
          <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teachers by name or subject..."
            className="w-full bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded-lg border border-[#34415b] bg-[#071023] px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Departments</option>
            <option value="mathematics">Mathematics</option>
            <option value="english language">English Language</option>
            <option value="basic science">Basic Science</option>
            <option value="social studies">Social Studies</option>
          </select>
        </div>
      </div>

      {/* Teacher Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTeachers.map((teacher) => (
          <Card key={teacher.name} className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0 hover:border-[#3d5377] transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#15314d] text-lg font-bold text-[#7dd3fc]">
                  {teacher.name.replace(/^(Mr\.|Mrs\.|Miss)\s+/, "").charAt(0)}
                </div>
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-300">
                  {teacher.role}
                </span>
              </div>

              <p className="text-base font-bold text-white truncate">{teacher.name}</p>
              <p className="mt-0.5 text-xs text-[#58c4e8] font-medium">{teacher.department}</p>

              <div className="mt-4 pt-3 border-t border-[#233148] space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Class load</span>
                  <span className="font-bold text-white">{teacher.load}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Classes taught</span>
                  <span className="font-semibold text-slate-200">{teacher.classesCount} Classes</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400 truncate">
                  <Mail className="h-3 w-3 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{teacher.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SchoolLayout>
  );
}

export default SchoolTeachersPage;
