import { Navigation } from "@/components/Navigation";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { usePublicAuthAction } from "@/hooks/usePublicAuthAction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Sparkles, Building } from "lucide-react";

export default function PricingPage() {
  const { handleLoginClick, handleGetStartedClick } = usePublicAuthAction();

  const faqs = [
    {
      q: "Can I try Éclat before paying?",
      a: "Yes! Every new account includes a free full practice quiz and access to national leaderboard previews without requiring payment details.",
    },
    {
      q: "How do monthly cash competitions work?",
      a: "Active monthly and annual subscribers compete on the nationwide leaderboard. Top-ranking students at the end of each calendar month receive verified cash awards and certificates.",
    },
    {
      q: "Can schools purchase bulk licenses for their students?",
      a: "Absolutely! Schools can register an administrative account to manage multiple cohorts (Primary 6 & JSS 3), assign custom practice tests, and access institutional volume pricing.",
    },
    {
      q: "Can parents manage multiple children on one account?",
      a: "Yes, parents can link multiple children to their parent portal, monitor each child's diagnostic analytics independently, and assign personalized practice quizzes.",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#080f22] text-slate-900 dark:text-slate-100 selection:bg-[#3bc2f3] selection:text-slate-950 font-sans transition-colors duration-200">
      <Navigation onLoginClick={handleLoginClick} onGetStartedClick={handleGetStartedClick} />
      
      {/* Page Header */}
      <section className="pt-20 pb-10 px-4 sm:px-6 lg:px-8 text-center bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-[#071023] dark:via-[#081225] dark:to-[#080f22] border-b border-slate-200 dark:border-[#202b43] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#3bc2f3]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-3xl relative z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 dark:bg-[#0c2438] border border-cyan-200 dark:border-[#2d4b68] text-cyan-800 dark:text-[#58c4e8] text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Simple & Transparent Plans</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
            Invest in Academic Excellence
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal">
            Affordable subscriptions designed for Nigerian students, parents, and schools.
          </p>
        </div>
      </section>

      {/* Main Pricing Cards */}
      <Pricing onGetStartedClick={handleGetStartedClick} />

      {/* School Enterprise Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#080f22]">
        <div className="container mx-auto max-w-5xl">
          <div className="border border-slate-200 dark:border-[#233148] bg-white dark:bg-[#0c1628] rounded-2xl p-8 sm:p-10 shadow-md dark:shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 hover:border-[#3bc2f3]/40 transition-all">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-[#0c2438] border border-cyan-200 dark:border-[#2d4b68] text-[#0c9dcc] dark:text-[#3bc2f3] flex items-center justify-center flex-shrink-0 shadow-sm">
                <Building className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Looking for a School Plan?</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm max-w-xl leading-relaxed">
                  Get custom cohort management, automated class homework assignments, CSV grade book exports, and discounted institutional licensing.
                </p>
              </div>
            </div>
            <Button 
              size="lg" 
              onClick={handleGetStartedClick} 
              className="font-extrabold text-sm px-8 h-12 rounded-xl bg-[#3bc2f3] text-slate-950 hover:bg-[#32ade0] shadow-lg shadow-cyan-500/20 flex-shrink-0"
            >
              Register Your School
            </Button>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#071023] border-t border-slate-200 dark:border-[#202b43]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-[#0c9dcc] dark:text-[#58c4e8] font-bold text-xs uppercase tracking-wider mb-2">
              <HelpCircle className="h-4 w-4 text-amber-500" />
              <span>Got Questions?</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {faqs.map((faq, i) => (
              <Card key={i} className="border border-slate-200 dark:border-[#233148] bg-slate-50/80 dark:bg-[#0c1628] hover:border-[#3bc2f3]/40 transition-all rounded-2xl shadow-sm dark:shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
