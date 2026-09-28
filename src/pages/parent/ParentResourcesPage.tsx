import { useState } from "react";
import { HelpCircle, BookOpen, FileText, Mail, Phone, MessageSquare, Loader2, ChevronRight, Search, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function ParentResourcesPage() {
  const { user } = useAuth();
  const [supportMessage, setSupportMessage] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    if (!user) {
      toast.error("You must be logged in to send a support request.");
      return;
    }
    setSendingSupport(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-support-email", {
        body: {
          user_id: user.id,
          message: supportMessage.trim(),
        },
      });

      if (error) throw error;

      toast.success("Support request sent! Our academic support team will contact you shortly.");
      setSupportMessage("");
    } catch (error: any) {
      console.error("Error sending support email:", error);
      toast.error(error.message || "Failed to send support request. Please try again.");
    } finally {
      setSendingSupport(false);
    }
  };

  const guideCards = [
    { icon: BookOpen, title: "Standard Examinations", subtitle: "Common Entrance & BECE Guide", description: "Scoring rubrics, reliable question types, and revision timelines for all core subjects." },
    { icon: FileText, title: "Family Accounts", subtitle: "Managing children & codes", description: "Generate or update a child profile, link a student account, and track daily activity." },
    { icon: ShieldCheck, title: "Targeted Mastery", subtitle: "Parent tasks & custom drills", description: "Assign custom drills and focus on weak topics identified by diagnostic analytics." },
    { icon: HelpCircle, title: "Billing & Subscriptions", subtitle: "Invoicing & card management", description: "Manage multiple children, update annual plan renewals, and view payment history." },
  ];

  const filteredGuides = guideCards.filter(
    (g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2d4b68] bg-[#0c2438] px-3 py-1 text-[11px] font-semibold text-[#58c4e8]">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Support &amp; Learning</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#71c9ed]">
            Help &amp; Support Hub<span className="text-[#3bc2f3]">.</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Curriculum breakdowns, syllabus guidelines, and direct assistance for parents.
          </p>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides, FAQ, or billing..."
            className="pl-10 h-10 rounded-xl border border-[#26344d] bg-[#0d162a] text-xs sm:text-sm text-slate-200 placeholder:text-slate-400 focus:border-[#3bc2f3]/60 focus:ring-1 focus:ring-[#3bc2f3]/20"
          />
        </div>
      </div>

      {/* Main Grid: Knowledge Categories & Direct Assistance */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6 sm:space-y-8">
          {/* Guide Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 bg-[#3bc2f3] rounded-full" />
                <h2 className="text-lg sm:text-xl font-black text-[#71c9ed] tracking-tight">Parent Guides &amp; Resources</h2>
              </div>
              <span className="text-xs text-slate-400">{filteredGuides.length} articles</span>
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {filteredGuides.map(({ icon: Icon, title, subtitle, description }, index) => (
                <Card
                  key={title}
                  className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 hover:border-[#384c6e] transition-colors p-4 sm:p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0c2438] text-[#58c4e8] border border-[#2d4b68]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{subtitle}</span>
                    <h3 className="mt-1 text-base font-bold text-[#71c9ed]">{title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">{description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#1e2c45] flex items-center justify-between text-xs font-semibold text-[#58c4e8] hover:text-white cursor-pointer">
                    <span>Read walkthrough</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1e2c45] pb-3">
              <div className="h-5 w-1 bg-[#3bc2f3] rounded-full" />
              <h3 className="text-lg sm:text-xl font-black text-[#71c9ed] tracking-tight">Frequently Asked Questions</h3>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-2.5">
              {[
                {
                  q: "How do I link my child's school account to my parent portal?",
                  a: "Use the unique connection code provided under your parent avatar menu. When your child signs in, they can input your code, or you can register them directly with their student ID.",
                },
                {
                  q: "Can I assign specific topics that my child is struggling with?",
                  a: "Yes! Use the 'Assign Practice' button on the Assignments page or directly from your child's card in 'My Children'. You can select any curriculum subject and drill down to exact sub-topics.",
                },
                {
                  q: "How are the national leaderboard and percentile ranks calculated?",
                  a: "Percentile ranks are calculated dynamically across all registered learners in the same class year cohort (Year 6 Common Entrance or Year 9 BECE) based on accuracy and quiz volume.",
                },
                {
                  q: "How does Éclat ensure questions match the national curriculum?",
                  a: "All question banks, reading comprehension passages, and diagrams are curated specifically for the Nigerian Basic Education Certificate Examination (BECE) and National Common Entrance Examination (NCEE) syllabi.",
                },
              ].map((item, idx) => (
                <AccordionItem
                  key={idx}
                  value={`item-${idx}`}
                  className="rounded-xl border border-[#202b43] bg-[#080f22] px-4"
                >
                  <AccordionTrigger className="py-3 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:text-white hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-3 text-xs leading-relaxed text-slate-400">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>

        {/* Contact & Support Section */}
        <div className="space-y-6">
          <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2c45] pb-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Direct Assistance</span>
                <h3 className="text-base sm:text-lg font-bold text-[#71c9ed] mt-0.5">Parent Support Desk</h3>
              </div>
              <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                Online
              </span>
            </div>

            <div className="rounded-xl border border-[#202b43] bg-[#080f22] p-4 space-y-2">
              <h4 className="text-sm font-bold text-[#71c9ed]">Need exam advice for your child?</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Our education coordinators are available to help you interpret mock results and craft personalized revision schedules.
              </p>
              <Button
                onClick={() => window.open("https://wa.me/2348130202112", "_blank")}
                className="w-full mt-2 bg-[#25d366]/20 text-[#25d366] hover:bg-[#25d366]/30 border border-[#25d366]/30 text-xs font-semibold rounded-xl h-9"
              >
                Chat on WhatsApp (+234 813 020 2112)
              </Button>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-[#202b43] bg-[#080f22]">
                <div className="p-2 bg-[#0c2438] text-[#58c4e8] rounded-lg">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Email Inquiries</p>
                  <p className="text-[11px] text-slate-400">support@eclatapp.xyz</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-[#202b43] bg-[#080f22]">
                <div className="p-2 bg-[#0c2438] text-[#58c4e8] rounded-lg">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Helpline</p>
                  <p className="text-[11px] text-slate-400">+234 813 020 2112 (Mon - Fri)</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Inquiry Form */}
          <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 p-5">
            <h3 className="text-base font-bold text-[#71c9ed] mb-1">Send a Message</h3>
            <p className="text-xs text-slate-400 mb-3">Questions about your subscription or features?</p>
            <form onSubmit={handleSendSupport} className="space-y-3">
              <Textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Describe your inquiry here..."
                className="min-h-[100px] rounded-xl border-[#26344d] bg-[#080f22] text-xs text-slate-200 placeholder:text-slate-400 focus:border-[#3bc2f3]"
              />
              <Button
                type="submit"
                disabled={sendingSupport || !supportMessage.trim()}
                className="w-full bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs rounded-xl h-9"
              >
                {sendingSupport ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  "Submit Inquiry"
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
