import { useState, useEffect } from "react";
import { Users, TrendingUp, Plus, Award, Target, ChevronRight, AlertTriangle, Search, Bell, Settings, BookOpen, FileText, Zap, BarChart3, MessageCircle, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { StudentReportDialog } from "@/components/StudentReportDialog";
import { AssignPracticeDialog } from "@/components/AssignPracticeDialog";
import { ChildOverviewCard } from "@/components/parent/ChildOverviewCard";
import { DummyPaymentModal } from "@/components/parent/DummyPaymentModal";
import { ParentActivityFeed } from "@/components/parent/ParentActivityFeed";
import { DeleteChildDialog } from "@/components/parent/DeleteChildDialog";
import { AddChildDialog } from "@/components/parent/AddChildDialog";
import { EditChildNameDialog } from "@/components/parent/EditChildNameDialog";
import { EditChildUsernameDialog } from "@/components/parent/EditChildUsernameDialog";
import { ChangeChildPasswordDialog } from "@/components/parent/ChangeChildPasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LinkedChild, ChildAnalytics, QuizResult, Assignment } from "@/types/parent";
import { getEdgeFunctionError } from "@/lib/errorUtils";
import eclatlLogo from "@/assets/logo.png";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reportOpen, setReportOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [parentUserId, setParentUserId] = useState<string | null>(null);
  const [childrenAnalytics, setChildrenAnalytics] = useState<Map<string, ChildAnalytics>>(new Map());
  const [globalActivities, setGlobalActivities] = useState<QuizResult[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentChild, setSelectedPaymentChild] = useState<{ id: string; name: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [managedChild, setManagedChild] = useState<LinkedChild | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editUsernameOpen, setEditUsernameOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [parentCode, setParentCode] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = async () => {
    if (parentCode) {
      await navigator.clipboard.writeText(parentCode);
      setCopiedCode(true);
      toast.success("Parent link code copied to clipboard!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Derived Top-Level Metrics
  const totalChildren = linkedChildren.length;
  const premiumChildrenCount = linkedChildren.filter(c => c.is_premium).length;

  let totalQuizzesGlobal = 0;
  let totalScoreGlobal = 0;

  childrenAnalytics.forEach(analytics => {
    totalQuizzesGlobal += analytics.totalQuizzes;
    totalScoreGlobal += (analytics.averageScore * analytics.totalQuizzes); // Weighted sum
  });

  const overallAverage = totalQuizzesGlobal > 0 ? Math.round(totalScoreGlobal / totalQuizzesGlobal) : 0;

  useEffect(() => {
    const fetchParentData = async () => {
      if (!user) return;

      try {
        const { data: parentData } = await supabase
          .from("parents")
          .select("id")
          .eq("user_id", user.id)
          .single();

        const { data: profileData } = await supabase
          .from("profiles")
          .select("unique_id, full_name")
          .eq("id", user.id)
          .single();

        if (profileData?.unique_id) {
          setParentCode(profileData.unique_id);
        }

        if (parentData) {
          setParentUserId(parentData.id);
          await fetchLinkedChildren(parentData.id);
        }
      } catch (error) {
        console.error("Error fetching parent data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParentData();
  }, [user]);

  const fetchLinkedChildren = async (parentId: string) => {
    try {
      setGlobalActivities([]); // Reset global activities before fetching
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          user_id,
          class_year,
          is_premium,
          profile:profiles(full_name, unique_id, username)
        `)
        .eq("parent_id", parentId);

      if (error) throw error;

      if (data) {
        setLinkedChildren(data as unknown as LinkedChild[]);
        // Fetch analytics and assignments for each child
        data.forEach((child) => {
          fetchChildAnalytics(child.id, child.profile?.full_name || "Unknown");
          fetchChildAssignments(child.id);
        });
      }
    } catch (error) {
      console.error("Error fetching linked children:", error);
      toast.error("Failed to load linked children");
    }
  };

  const handleDeleteChild = async () => {
    if (!managedChild) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-student-account", {
        body: { studentId: managedChild.id },
      });

      if (error) {
        const message = await getEdgeFunctionError(error, "Failed to delete student account");
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      toast.success(`${managedChild.profile.full_name}'s account deleted.`);
      setDeleteDialogOpen(false);
      setManagedChild(null);

      if (parentUserId) {
        await fetchLinkedChildren(parentUserId);
      }
    } catch (error: unknown) {
      console.error("Error deleting child:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete student account");
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchChildAnalytics = async (studentId: string, studentName: string) => {
    try {
      const { data: quizResults, error } = await supabase
        .from("quiz_results")
        .select("*")
        .eq("student_id", studentId)
        .order("completed_at", { ascending: false });

      if (error) throw error;

      if (quizResults && quizResults.length > 0) {
        const averageScore = quizResults.reduce((acc, result) => acc + result.score, 0) / quizResults.length;
        const subjectMap = new Map<string, { totalScore: number; count: number }>();
        quizResults.forEach((result) => {
          const existing = subjectMap.get(result.subject) || { totalScore: 0, count: 0 };
          subjectMap.set(result.subject, {
            totalScore: existing.totalScore + result.score,
            count: existing.count + 1,
          });
        });

        const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, data]) => ({
          subject: subject.charAt(0).toUpperCase() + subject.slice(1),
          avgScore: Math.round(data.totalScore / data.count),
          count: data.count,
        }));

        const analytics: ChildAnalytics = {
          studentId,
          averageScore: Math.round(averageScore),
          totalQuizzes: quizResults.length,
          subjectPerformance,
          recentQuizzes: quizResults.slice(0, 5) as QuizResult[],
        };

        setChildrenAnalytics((prev) => new Map(prev).set(studentId, analytics));

        const activitiesWithName = quizResults.map(q => ({ ...q, student_name: studentName })) as QuizResult[];

        setGlobalActivities(prev => {
          const combined = [...prev, ...activitiesWithName];
          const unique = combined.filter((activity, index, self) => 
            self.findIndex(a => a.id === activity.id) === index
          );
          return unique.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()).slice(0, 3);
        });
      }
    } catch (error) {
      console.error("Error fetching child analytics:", error);
    }
  };

  const fetchChildAssignments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from("practice_assignments")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      setLinkedChildren((prev) =>
        prev.map((child) =>
          child.id === studentId ? { ...child, assignments: data as Assignment[] } : child
        )
      );
    } catch (error) {
      console.error("Error fetching child assignments:", error);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2d4b68] bg-[#0c2438] px-3 py-1 text-[11px] font-semibold text-[#58c4e8]">
            <Award className="h-3.5 w-3.5" />
            <span>Family Portal</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#71c9ed]">
            Parent Overview<span className="text-[#3bc2f3]">.</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Empower your children's BECE &amp; Common Entrance preparation with real-time analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard/parent/reports")}
            className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 text-xs sm:text-sm"
          >
            View Reports
          </Button>
          <Button
            onClick={() => setAddChildOpen(true)}
            className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs sm:text-sm"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Child
          </Button>
        </div>
      </div>

      {/* Top-Level Overview Metrics */}
      {!isLoading && linkedChildren.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-[#233148] bg-[#0c1628] text-slate-100 rounded-2xl min-w-0 hover:border-[#384c6e] transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Children</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-white">{totalChildren}</p>
                <p className="text-[11px] text-[#58c4e8] mt-0.5">Enrolled</p>
              </div>
              <div className="p-3 bg-[#0c2438] text-[#58c4e8] rounded-xl flex-shrink-0">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#233148] bg-[#0c1628] text-slate-100 rounded-2xl min-w-0 hover:border-[#384c6e] transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Avg Score</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-white">{overallAverage}%</p>
                <p className="text-[11px] text-emerald-400 mt-0.5">Overall Accuracy</p>
              </div>
              <div className="p-3 bg-[#102f2b] text-[#48d7b7] rounded-xl flex-shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#233148] bg-[#0c1628] text-slate-100 rounded-2xl min-w-0 hover:border-[#384c6e] transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Quizzes</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-white">{totalQuizzesGlobal}</p>
                <p className="text-[11px] text-[#c4a9ff] mt-0.5">Completed</p>
              </div>
              <div className="p-3 bg-[#2b2145] text-[#c4a9ff] rounded-xl flex-shrink-0">
                <Target className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#233148] bg-[#0c1628] text-slate-100 rounded-2xl min-w-0 hover:border-[#384c6e] transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Plan</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-white">
                  {premiumChildrenCount} <span className="text-xs font-bold text-amber-400">VIP</span>
                </p>
                <p className="text-[11px] text-[#ffca6a] mt-0.5">Premium Learners</p>
              </div>
              <div className="p-3 bg-[#352813] text-[#ffca6a] rounded-xl flex-shrink-0">
                <Award className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Children Overview */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-slate-400 text-sm">Loading your family data...</p>
        </div>
      ) : linkedChildren.length === 0 ? (
        <Card className="border-2 border-dashed border-[#26344d] bg-[#0c1628] text-slate-100 rounded-2xl">
          <CardContent className="py-16 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-[#0c2438] text-[#58c4e8] rounded-full flex items-center justify-center mb-5">
              <Users className="h-10 w-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#71c9ed] mb-2">Welcome to your Parent Portal!</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto text-xs sm:text-sm">
              Connect or create an account for your child. Once linked, you can monitor exam readiness, track strengths, and assign targeted drills.
            </p>
            <Button
              onClick={() => setAddChildOpen(true)}
              className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold px-6 py-2.5 rounded-xl shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Child Account
            </Button>

            {parentCode && (
              <div className="mt-8 pt-6 border-t border-[#1d2a40] max-w-sm w-full">
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">Or link existing student account</p>
                <p className="text-xs text-slate-400 mb-3">Share this Parent Link Code with your child:</p>
                <code className="block border border-dashed border-[#31506c] bg-[#091426] px-3 py-3 text-center text-xl font-bold tracking-[0.25em] text-[#71c9ed] rounded-xl select-all">
                  {parentCode}
                </code>
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full border-[#2d4b68] bg-[#091426] hover:bg-[#15273f] hover:border-[#3bc2f3] text-slate-200 font-semibold"
                >
                  {copiedCode ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-emerald-400" />
                      copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4 text-[#58c4e8]" />
                      copy code
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-8 sm:gap-10">
          {/* Recent Activities & Parent Link Code Section (Matching Student Dashboard) */}
          <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* Activity Feed Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-5 w-1 bg-[#3bc2f3] rounded-full" />
                  <h3 className="text-lg sm:text-xl font-black text-[#71c9ed] tracking-tight">Recent Activities</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard/parent/activities")}
                  className="text-xs font-semibold text-[#58c4e8] hover:text-white hover:bg-[#15233c] rounded-xl"
                >
                  View All <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
              <ParentActivityFeed activities={globalActivities} isLoading={isLoading} />
            </div>

            {/* Parent Link Code Card - Matching Student Dashboard */}
            <div className="space-y-4 flex flex-col">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-1 bg-[#3bc2f3] rounded-full" />
                <h3 className="text-lg sm:text-xl font-black text-[#71c9ed] tracking-tight">Parent Link Code</h3>
              </div>
              <div className="rounded-2xl border border-[#233148] bg-[#0c1628] p-5 text-slate-100 flex flex-col justify-between flex-1">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-[#71c9ed]">Parent Link Code</h2>
                  <p className="mt-1 text-xs text-slate-400">Share this code with your child to connect accounts</p>
                  {parentCode ? (
                    <>
                      <code className="mt-5 block border border-dashed border-[#31506c] bg-[#091426] px-3 py-4 text-center text-2xl font-bold tracking-[0.25em] text-[#71c9ed] rounded-xl select-all">
                        {parentCode}
                      </code>
                      <Button
                        onClick={handleCopyCode}
                        variant="outline"
                        className="mt-3 w-full border-[#2d4b68] bg-[#091426] hover:bg-[#15273f] hover:border-[#3bc2f3] text-slate-200 font-semibold"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="mr-2 h-4 w-4 text-emerald-400" />
                            copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4 text-[#58c4e8]" />
                            copy code
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <p className="mt-6 text-sm text-slate-400">Your link code will appear here.</p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#1d2a40] space-y-1.5 text-xs text-slate-400">
                  <p className="flex items-center gap-2 text-slate-300 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3bc2f3]" />
                    How to connect:
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Children can link your account by entering this code in their dashboard under settings or during sign-up.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* My Children Section */}
          <div id="children" className="space-y-4 scroll-mt-24">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-1 bg-[#3bc2f3] rounded-full" />
                <h3 className="text-lg sm:text-xl font-black text-[#71c9ed] tracking-tight">My Children</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/parent/children")}
                className="text-xs font-semibold text-[#58c4e8] hover:text-white hover:bg-[#15233c] rounded-xl"
              >
                View All <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {linkedChildren.slice(0, 1).map((child, index) => (
                <ChildOverviewCard
                  key={child.id}
                  child={child}
                  index={index}
                  analytics={childrenAnalytics.get(child.id)}
                  assignments={child.assignments}
                  onViewReport={(c) => {
                    setSelectedChild(c);
                    setReportOpen(true);
                  }}
                  onAssignPractice={(c) => {
                    setSelectedChild(c);
                    setAssignOpen(true);
                  }}
                  onUpgradePremium={(c) => {
                    setSelectedPaymentChild({ id: c.id, name: c.profile.full_name || "Unknown" });
                    setPaymentModalOpen(true);
                  }}
                  onDeleteChild={(c) => {
                    setManagedChild(c);
                    setDeleteDialogOpen(true);
                  }}
                  onEditName={(c) => {
                    setManagedChild(c);
                    setEditNameOpen(true);
                  }}
                  onEditUsername={(c) => {
                    setManagedChild(c);
                    setEditUsernameOpen(true);
                  }}
                  onChangePassword={(c) => {
                    setManagedChild(c);
                    setChangePasswordOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}


      <StudentReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        studentId={selectedChild?.id || ""}
        studentName={selectedChild?.profile.full_name || ""}
        studentClass={selectedChild?.class_year === "year_6" ? "Year 6" : "Year 9"}
        avatar={selectedChild?.profile.full_name?.charAt(0).toUpperCase() || "?"}
      />
      <AssignPracticeDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        child={selectedChild}
      />

      <AddChildDialog
        open={addChildOpen}
        onOpenChange={setAddChildOpen}
        parentId={parentUserId}
        onSuccess={() => parentUserId && fetchLinkedChildren(parentUserId)}
      />

      <DummyPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        studentId={selectedPaymentChild?.id || ""}
        studentName={selectedPaymentChild?.name || ""}
        onSuccess={() => {
          if (parentUserId) fetchLinkedChildren(parentUserId);
        }}
      />

      <DeleteChildDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        child={managedChild}
        onConfirm={handleDeleteChild}
        isDeleting={isDeleting}
      />

      <EditChildNameDialog
        open={editNameOpen}
        onOpenChange={setEditNameOpen}
        child={managedChild}
        onSuccess={() => parentUserId && fetchLinkedChildren(parentUserId)}
      />
      
      <EditChildUsernameDialog
        open={editUsernameOpen}
        onOpenChange={setEditUsernameOpen}
        child={managedChild}
        onSuccess={() => parentUserId && fetchLinkedChildren(parentUserId)}
      />

      <ChangeChildPasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        child={managedChild}
      />
    </div>
  );
}
