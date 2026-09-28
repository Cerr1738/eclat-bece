import { useState } from "react";
import { Settings, Copy, Check, Building2, Mail, MapPin, Shield, Sun, Moon, Laptop, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { SchoolSettingsDialog } from "@/components/school/SchoolSettingsDialog";
import { useSchoolData } from "@/hooks/useSchoolData";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export function SchoolSettingsPage() {
  const { school, refresh } = useSchoolData();
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!school?.school_code) return;
    try {
      await navigator.clipboard.writeText(school.school_code);
      setCopied(true);
      toast.success("School code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy school code");
    }
  };

  return (
    <SchoolLayout
      title="Settings"
      subtitle="Manage school registration details, enrollment codes, and administrative preferences."
      actions={
        <Button
          onClick={() => setSettingsOpen(true)}
          className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs sm:text-sm"
        >
          <Settings className="mr-1.5 h-4 w-4" />
          Update profile
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* School Profile Card */}
        <Card className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0">
          <CardHeader className="border-b border-[#202b43] pb-3">
            <CardTitle className="text-base font-semibold text-[#71c9ed] flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#58c4e8]" />
              School Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-700/80 bg-[#0c1424] p-3.5">
              <div>
                <p className="text-xs text-slate-400">School Enrollment Code</p>
                <p className="text-[11px] text-slate-400">Share with students to link them automatically</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-[#7dd3fc]">
                  {school?.school_code || "PENDING"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-8 px-2 text-slate-300 hover:text-white"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-700/80 bg-[#0c1424] p-3.5 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="h-4 w-4 text-slate-500" />
                <span>Institution Name</span>
              </div>
              <span className="font-semibold text-white">{school?.school_name || "Lighthouse Academy"}</span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-700/80 bg-[#0c1424] p-3.5 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-4 w-4 text-slate-500" />
                <span>Contact Email</span>
              </div>
              <span className="text-slate-200">{school?.contact_email || "admin@school.edu"}</span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-700/80 bg-[#0c1424] p-3.5 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span>Campus Location</span>
              </div>
              <span className="text-slate-200">{school?.address || "Lagos, Nigeria"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Operational Preferences Card */}
        <Card className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0">
          <CardHeader className="border-b border-[#202b43] pb-3">
            <CardTitle className="text-base font-semibold text-[#71c9ed] flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#58c4e8]" />
              Institutional Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 text-xs sm:text-sm">
            {[
              { title: "Enable automated practice reminders", desc: "Notify students when new assignments are due" },
              { title: "Allow student self-enrollment", desc: "Permit learners to join using the school referral code" },
              { title: "Publish monthly leaderboard standing", desc: "Display school ranking on public and national leaderboards" },
              { title: "Parent performance notifications", desc: "Allow linked parents to view ward mock evaluation grades" },
            ].map((pref) => (
              <label
                key={pref.title}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-700/80 bg-[#0c1424] p-3.5 cursor-pointer hover:border-[#384c6e] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{pref.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{pref.desc}</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 mt-0.5 accent-sky-400 rounded cursor-pointer"
                />
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Appearance & Theme Card */}
        <Card className="border border-[#2a3852] bg-[#151e33] text-slate-100 min-w-0 lg:col-span-2">
          <CardHeader className="border-b border-[#202b43] pb-3">
            <CardTitle className="text-base font-semibold text-[#71c9ed] flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#58c4e8]" />
              Appearance & Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <p className="text-xs sm:text-sm text-slate-400 mb-4">
              Select your visual preference for the school administrative console.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <Button
                type="button"
                variant={theme === "light" ? "default" : "outline"}
                className={`flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl transition-all ${
                  theme === "light"
                    ? "bg-[#3bc2f3] text-slate-950 font-bold shadow-md shadow-cyan-500/20 hover:bg-[#32ade0]"
                    : "border-slate-700/80 bg-[#0c1424] text-slate-300 hover:text-white hover:bg-[#1a263d] hover:border-[#3bc2f3]"
                }`}
                onClick={() => setTheme("light")}
              >
                <Sun className="h-5 w-5 text-amber-400" />
                <span className="text-xs font-semibold">Light</span>
              </Button>
              <Button
                type="button"
                variant={theme === "dark" ? "default" : "outline"}
                className={`flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl transition-all ${
                  theme === "dark"
                    ? "bg-[#3bc2f3] text-slate-950 font-bold shadow-md shadow-cyan-500/20 hover:bg-[#32ade0]"
                    : "border-slate-700/80 bg-[#0c1424] text-slate-300 hover:text-white hover:bg-[#1a263d] hover:border-[#3bc2f3]"
                }`}
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-5 w-5 text-[#3bc2f3]" />
                <span className="text-xs font-semibold">Dark</span>
              </Button>
              <Button
                type="button"
                variant={theme === "system" ? "default" : "outline"}
                className={`flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl transition-all ${
                  theme === "system"
                    ? "bg-[#3bc2f3] text-slate-950 font-bold shadow-md shadow-cyan-500/20 hover:bg-[#32ade0]"
                    : "border-slate-700/80 bg-[#0c1424] text-slate-300 hover:text-white hover:bg-[#1a263d] hover:border-[#3bc2f3]"
                }`}
                onClick={() => setTheme("system")}
              >
                <Laptop className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-semibold">System</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <SchoolSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        school={school}
        onSuccess={() => refresh()}
      />
    </SchoolLayout>
  );
}

export default SchoolSettingsPage;
