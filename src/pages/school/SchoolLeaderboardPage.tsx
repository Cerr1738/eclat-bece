import { useState, useEffect } from "react";
import { Trophy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { CompetitionLeaderboards, LeaderboardStudent } from "@/components/CompetitionLeaderboards";
import { fetchLeaderboardData } from "@/utils/leaderboard";
import { useSchoolData } from "@/hooks/useSchoolData";

const fallbackMonthly: LeaderboardStudent[] = [
  { rank: 1, name: "Aisha Bello", school: "Lighthouse Academy", points: 3420, avatar: "🥇" },
  { rank: 2, name: "Daniel Adebayo", school: "Lighthouse Academy", points: 3180, avatar: "🥈" },
  { rank: 3, name: "Grace Okafor", school: "Lighthouse Academy", points: 2950, avatar: "🥉" },
  { rank: 4, name: "Emmanuel Eze", school: "Crown College", points: 2710, avatar: "🌟" },
  { rank: 5, name: "Zainab Ibrahim", school: "Apex High", points: 2640, avatar: "🎯" },
];

const fallbackAnnual: LeaderboardStudent[] = [
  { rank: 1, name: "Aisha Bello", school: "Lighthouse Academy", points: 14200, avatar: "👑" },
  { rank: 2, name: "Samuel Adeleke", school: "St. Gregory College", points: 13850, avatar: "🥈" },
  { rank: 3, name: "Daniel Adebayo", school: "Lighthouse Academy", points: 12900, avatar: "🥉" },
  { rank: 4, name: "Chioma Nwosu", school: "Kings College", points: 11500, avatar: "🌟" },
  { rank: 5, name: "Grace Okafor", school: "Lighthouse Academy", points: 10800, avatar: "🎯" },
];

export function SchoolLeaderboardPage() {
  const { school } = useSchoolData();
  const [monthlyLeaders, setMonthlyLeaders] = useState<LeaderboardStudent[]>(fallbackMonthly);
  const [annualLeaders, setAnnualLeaders] = useState<LeaderboardStudent[]>(fallbackAnnual);
  const [loading, setLoading] = useState(false);

  const loadLeaders = async () => {
    try {
      setLoading(true);
      const res = await fetchLeaderboardData(school?.id);
      if (res.monthlyLeaders && res.monthlyLeaders.length > 0) {
        setMonthlyLeaders(res.monthlyLeaders);
      }
      if (res.annualLeaders && res.annualLeaders.length > 0) {
        setAnnualLeaders(res.annualLeaders);
      }
    } catch (err) {
      console.error("Error fetching leaderboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaders();
  }, [school?.id]);

  return (
    <SchoolLayout
      title="Leaderboards & Competitions"
      subtitle="Track institutional rankings, regional standings, and learner point leaders."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={loadLeaders}
          disabled={loading}
          className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 text-xs sm:text-sm"
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh rankings
        </Button>
      }
    >
      <div className="w-full min-w-0">
        <CompetitionLeaderboards
          monthlyLeaders={monthlyLeaders}
          annualLeaders={annualLeaders}
          showCurrentUserPosition={false}
        />
      </div>
    </SchoolLayout>
  );
}

export default SchoolLeaderboardPage;
