import { Navigation } from "@/components/Navigation";
import { About } from "@/components/About";
import { Footer } from "@/components/Footer";
import { usePublicAuthAction } from "@/hooks/usePublicAuthAction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, Award, ArrowRight } from "lucide-react";

export default function AboutPage() {
  const { handleLoginClick, handleGetStartedClick } = usePublicAuthAction();

  const values = [
    {
      icon: BookOpen,
      title: "Curriculum-Aligned Preparation",
      description: "Our question bank is strictly developed against official Nigerian Ministry of Education, WAEC BECE, and National Common Entrance Examination benchmarks.",
      color: "text-[#0c9dcc] dark:text-[#3bc2f3]",
      bg: "bg-cyan-50 dark:bg-[#3bc2f3]/10",
    },
    {
      icon: Award,
      title: "Gamified Motivation & Rewards",
      description: "We turn study time into friendly nationwide contests with live leaderboards, badges, streaks, and real cash prizes to keep students eager to practice.",
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-400/10",
    },
    {
      icon: GraduationCap,
      title: "Parent & School Collaboration",
      description: "Empowering educators and parents with diagnostic insights, custom homework assignment tools, and real-time early warning metrics.",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-400/10",
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
            <GraduationCap className="h-4 w-4 text-amber-500" />
            <span>Empowering Nigerian Scholars</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
            Transforming Exam Prep into an <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0c9dcc] via-cyan-600 to-[#d97706] dark:from-[#3bc2f3] dark:via-cyan-100 dark:to-[#ffca6a]">
              Inspiring Journey
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
            Éclat is Nigeria's leading diagnostic and competitive quiz platform for Primary 6 Common Entrance and JSS 3 BECE candidates.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              size="lg" 
              onClick={handleGetStartedClick} 
              className="font-extrabold text-base px-8 h-12 rounded-xl bg-[#3bc2f3] text-slate-950 hover:bg-[#32ade0] shadow-lg shadow-cyan-500/25 transition-all"
            >
              <span>Join Free Today</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Core How It Works Section */}
      <About />

      {/* Pillars of Excellence */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#080f22]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">Our Core Pillars</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base">Built from the ground up for Nigerian educational excellence.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <Card key={i} className="border border-slate-200 dark:border-[#233148] bg-white dark:bg-[#0c1628] hover:border-[#3bc2f3]/50 transition-all duration-300 rounded-2xl shadow-md dark:shadow-xl">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl ${v.bg} border border-slate-200 dark:border-[#233148] ${v.color} flex items-center justify-center mb-4`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">{v.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{v.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#071023] border-t border-slate-200 dark:border-[#202b43] text-center">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">Ready to excel in your upcoming examinations?</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base mb-6">Start with a free practice quiz or register your school to onboard entire classes.</p>
          <Button 
            size="lg" 
            onClick={handleGetStartedClick} 
            className="font-extrabold text-base px-8 h-12 rounded-xl bg-[#3bc2f3] text-slate-950 hover:bg-[#32ade0] shadow-lg shadow-cyan-500/25"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
