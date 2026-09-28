import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { usePublicAuthAction } from "@/hooks/usePublicAuthAction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  BarChart3, 
  Trophy, 
  Swords, 
  Users, 
  School, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight
} from "lucide-react";

export default function FeaturesPage() {
  const { handleLoginClick, handleGetStartedClick } = usePublicAuthAction();

  const featureList = [
    {
      icon: BookOpen,
      title: "Authentic Examination Practice",
      tag: "Exam Simulation",
      description: "Thousands of questions structured precisely for WAEC BECE (Year 9) and National Common Entrance (Year 6) across Mathematics, English, Basic Science, Social Studies, and Business Studies.",
      highlights: ["Official curriculum alignment", "Step-by-step answer explanations", "Timed CBT mode"],
      color: "text-[#0c9dcc] dark:text-[#3bc2f3]",
      bg: "bg-cyan-50 dark:bg-[#3bc2f3]/10",
    },
    {
      icon: BarChart3,
      title: "Diagnostic Analytics & Telemetry",
      tag: "Smart Insights",
      description: "Pinpoint strengths and knowledge gaps with granular subject and topic breakdown scores. Get automated remediation tips on weakest areas.",
      highlights: ["Subject mastery tracking", "At-risk warnings (<65%)", "Pace and speed analysis"],
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-400/10",
    },
    {
      icon: Users,
      title: "Parental Oversight & Custom Drills",
      tag: "For Parents",
      description: "Parents can assign custom quizzes with tailored topics and time limits, monitor active learning time, and receive instant completion notifications.",
      highlights: ["Multi-child dashboard", "Targeted quiz assignments", "Instant score updates"],
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-400/10",
    },
    {
      icon: School,
      title: "School & Classroom Management",
      tag: "For Schools",
      description: "Teachers and school administrators can manage Year 6 & Year 9 cohorts, push weekly practice assignments to whole classes, and export formatted CSV grade books.",
      highlights: ["Class cohort breakdown", "Bulk quiz assignments", "One-click CSV exports"],
      color: "text-cyan-700 dark:text-cyan-300",
      bg: "bg-cyan-50 dark:bg-cyan-400/10",
    },
    {
      icon: Trophy,
      title: "National Competition Arena",
      tag: "Rewards & Gamification",
      description: "Compete with students across all 36 states. Top-performing scholars earn monthly cash rewards, trophies, and national recognition.",
      highlights: ["Monthly & annual leaderboards", "Streak multipliers", "Verified cash prizes"],
      color: "text-amber-600 dark:text-amber-300",
      bg: "bg-amber-50 dark:bg-amber-400/10",
    },
    {
      icon: Swords,
      title: "Duel of Minds Head-to-Head",
      tag: "Live Battles",
      description: "Challenge friends and classmates in real-time multiplayer academic battles. Quick-fire rounds make reviewing lessons thrilling.",
      highlights: ["Real-time multiplayer", "Subject-specific battles", "Elo rating rankings"],
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-400/10",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#080f22] text-slate-900 dark:text-slate-100 selection:bg-[#3bc2f3] selection:text-slate-950 font-sans transition-colors duration-200">
      <Navigation onLoginClick={handleLoginClick} onGetStartedClick={handleGetStartedClick} />
      
      {/* Hero Header */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-[#071023] dark:via-[#081225] dark:to-[#080f22] text-center border-b border-slate-200 dark:border-[#202b43] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#3bc2f3]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-4xl relative z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 dark:bg-[#0c2438] border border-cyan-200 dark:border-[#2d4b68] text-cyan-800 dark:text-[#58c4e8] text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Cutting-Edge Learning Suite</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
            Everything You Need for <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0c9dcc] via-cyan-600 to-[#d97706] dark:from-[#3bc2f3] dark:via-cyan-100 dark:to-[#ffca6a]">
              Exam Success
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
            Explore the powerful tools built into Éclat for students, parents, and educators.
          </p>
          <Button 
            size="lg" 
            onClick={handleGetStartedClick} 
            className="font-extrabold text-base px-8 h-12 rounded-xl bg-[#3bc2f3] text-slate-950 hover:bg-[#32ade0] shadow-lg shadow-cyan-500/25 transition-all"
          >
            <span>Try Free Practice Quiz</span>
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#080f22]">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {featureList.map((f, i) => {
              const Icon = f.icon;
              return (
                <Card key={i} className="border border-slate-200 dark:border-[#233148] bg-white dark:bg-[#0c1628] hover:border-[#3bc2f3]/50 hover:bg-slate-50/80 dark:hover:bg-[#0e1c33] transition-all duration-300 rounded-2xl shadow-md dark:shadow-xl flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${f.bg} border border-slate-200 dark:border-[#233148] ${f.color} flex items-center justify-center shadow-sm`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#080f22] border border-slate-200 dark:border-[#202b43] text-slate-600 dark:text-slate-300">
                        {f.tag}
                      </span>
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white mb-2">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6 font-normal">
                      {f.description}
                    </p>
                    <ul className="space-y-2 border-t border-slate-200 dark:border-[#202b43] pt-4">
                      {f.highlights.map((h, hi) => (
                        <li key={hi} className="flex items-center text-xs font-medium text-slate-700 dark:text-slate-200 gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#0c9dcc] dark:text-[#3bc2f3] shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#071023] border-t border-slate-200 dark:border-[#202b43] text-center">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">Start learning smarter today</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base mb-8">Join thousands of students and teachers advancing their academic journey.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              size="lg" 
              onClick={handleGetStartedClick} 
              className="font-extrabold text-sm px-8 h-12 rounded-xl bg-[#3bc2f3] text-slate-950 hover:bg-[#32ade0] shadow-lg shadow-cyan-500/25"
            >
              Get Started for Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={handleLoginClick} 
              className="font-extrabold text-sm px-8 h-12 rounded-xl bg-slate-100 dark:bg-[#080f22] border border-slate-200 dark:border-[#233148] text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#15273f] hover:border-[#3bc2f3] hover:text-slate-950 dark:hover:text-white"
            >
              Sign In to Account
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
