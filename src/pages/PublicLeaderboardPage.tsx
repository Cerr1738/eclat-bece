import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { CompetitionLeaderboards, LeaderboardStudent } from "@/components/CompetitionLeaderboards";
import { usePublicAuthAction } from "@/hooks/usePublicAuthAction";
import { fetchLeaderboardData } from "@/utils/leaderboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Award, Loader2, Gift, ArrowRight } from "lucide-react";

export default function PublicLeaderboardPage() {
  const { handleLoginClick, handleGetStartedClick } = usePublicAuthAction();
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyLeaders, setMonthlyLeaders] = useState<LeaderboardStudent[]>([]);
  const [annualLeaders, setAnnualLeaders] = useState<LeaderboardStudent[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadLeaderboard = async () => {
      try {
        const data = await fetchLeaderboardData();
        if (isMounted) {
          setMonthlyLeaders(data.monthlyLeaders || []);
          setAnnualLeaders(data.annualLeaders || []);
        }
      } catch (err) {
        console.error("Error loading public leaderboard:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadLeaderboard();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#080f22] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-[#3bc2f3] selection:text-slate-950 font-sans transition-colors duration-200">
      <Navigation onLoginClick={handleLoginClick} onGetStartedClick={handleGetStartedClick} />
      
      {/* Header & Prize Overview */}
      <section className="pt-20 pb-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-[#071023] dark:via-[#081225] dark:to-[#080f22] text-center border-b border-slate-200 dark:border-[#202b43] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#3bc2f3]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-4xl relative z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 dark:bg-[#0c2438] border border-cyan-200 dark:border-[#2d4b68] text-cyan-800 dark:text-[#58c4e8] text-xs sm:text-sm font-extrabold uppercase tracking-wider mb-4">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>National Academic Competition</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
            Official National Leaderboards
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 font-normal">
            Live rankings of the top 5 Primary 6 and JSS 3 scholars across Nigeria.
          </p>
          
          {/* Prize Breakdown Cards */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto mb-2 text-left">
            <Card className="border border-slate-200 dark:border-[#233148] bg-white dark:bg-[#0c1628] shadow-md dark:shadow-xl rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-[#0c9dcc] dark:text-[#3bc2f3] font-bold text-sm">
                  <Award className="h-5 w-5 flex-shrink-0" />
                  <span>Monthly Championship</span>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">₦50,000</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Awarded every month to top point earners across BECE & Common Entrance subjects.
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-[#233148] bg-white dark:bg-[#0c1628] shadow-md dark:shadow-xl rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 font-bold text-sm">
                  <Gift className="h-5 w-5 flex-shrink-0" />
                  <span>Annual Grand Prize</span>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">₦1,500,000</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Grand scholarship fund and awards presented at the conclusion of the academic year.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Leaderboard Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#080f22] flex-1">
        <div className="container mx-auto max-w-4xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-[#0c1628] rounded-3xl border border-slate-200 dark:border-[#233148]">
              <Loader2 className="h-10 w-10 animate-spin text-[#3bc2f3]" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading national leaderboard standings...</p>
            </div>
          ) : (
            <CompetitionLeaderboards
              showCurrentUserPosition={false}
              monthlyLeaders={monthlyLeaders}
              annualLeaders={annualLeaders}
              limit={5}
            />
          )}
        </div>
      </section>

      {/* CTA Join Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#071023] border-t border-slate-200 dark:border-[#202b43] text-center">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">Want your name on the national leaderboard?</h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-6 font-normal">Start taking quizzes today, earn competition points, and compete for scholarships.</p>
          <Button 
            size="lg" 
            onClick={handleGetStartedClick} 
            className="font-extrabold text-base px-8 h-12 rounded-xl bg-[#3bc2f3] text-slate-950 hover:bg-[#32ade0] shadow-lg shadow-cyan-500/25"
          >
            <span>Join Competition Free</span>
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
