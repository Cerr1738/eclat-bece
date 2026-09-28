import { useState, useEffect, useCallback } from "react";
import { Users, Plus, LayoutDashboard, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { StudentReportDialog } from "@/components/StudentReportDialog";
import { AssignPracticeDialog } from "@/components/AssignPracticeDialog";
import { ChildOverviewCard } from "@/components/parent/ChildOverviewCard";
import { DummyPaymentModal } from "@/components/parent/DummyPaymentModal";
import { AddChildDialog } from "@/components/parent/AddChildDialog";
import { DeleteChildDialog } from "@/components/parent/DeleteChildDialog";
import { EditChildNameDialog } from "@/components/parent/EditChildNameDialog";
import { EditChildUsernameDialog } from "@/components/parent/EditChildUsernameDialog";
import { ChangeChildPasswordDialog } from "@/components/parent/ChangeChildPasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LinkedChild, ChildAnalytics, Assignment, QuizResult } from "@/types/parent";
import { getEdgeFunctionError } from "@/lib/errorUtils";

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

export default function MyChildren() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [children, setChildren] = useState<LinkedChild[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [parentUserId, setParentUserId] = useState<string | null>(null);
    const [childrenAnalytics, setChildrenAnalytics] = useState<Map<string, ChildAnalytics>>(new Map());

    const [reportOpen, setReportOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [addChildOpen, setAddChildOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editNameOpen, setEditNameOpen] = useState(false);
    const [editUsernameOpen, setEditUsernameOpen] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);

    const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchAnalytics = useCallback(async (studentId: string) => {
        try {
            const { data: quizResults } = await supabase
                .from("quiz_results")
                .select("*")
                .eq("student_id", studentId)
                .order("completed_at", { ascending: false });

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
            }
        } catch (error) {
            console.error("Error fetching child analytics:", error);
        }
    }, []);

    const fetchAssignments = useCallback(async (studentId: string) => {
        try {
            const { data, error } = await supabase
                .from("practice_assignments")
                .select("*")
                .eq("student_id", studentId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            if (data) {
                setChildren((prev) =>
                    prev.map((c) =>
                        c.id === studentId ? { ...c, assignments: data as Assignment[] } : c
                    )
                );

                const pending = data.filter((a) => a.status === "pending").length;
                const completed = data.filter((a) => a.status === "completed").length;

                setChildrenAnalytics((prev) => {
                    const current = prev.get(studentId) || {
                        studentId,
                        averageScore: 0,
                        totalQuizzes: 0,
                        subjectPerformance: [],
                        recentQuizzes: [],
                        pendingAssignments: 0,
                        completedAssignments: 0,
                    };
                    return new Map(prev).set(studentId, {
                        ...current,
                        pendingAssignments: pending,
                        completedAssignments: completed,
                    });
                });
            }
        } catch (error) {
            console.error("Error fetching child assignments:", error);
        }
    }, []);

    const fetchChildren = useCallback(async (parentId: string) => {
        try {
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
                setChildren(data as unknown as LinkedChild[]);
                data.forEach((child) => {
                    fetchAnalytics(child.id);
                    fetchAssignments(child.id);
                });
            }
        } catch (error) {
            console.error("Error fetching children:", error);
            toast.error("Failed to load students");
        }
    }, [fetchAnalytics, fetchAssignments]);

    useEffect(() => {
        const fetchParentData = async () => {
            if (!user) return;
            try {
                const { data: parentData } = await supabase
                    .from("parents")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();

                if (parentData) {
                    setParentUserId(parentData.id);
                    await fetchChildren(parentData.id);
                }
            } catch (error) {
                console.error("Error fetching parent data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchParentData();
    }, [user, fetchChildren]);

    const handleDeleteChild = async () => {
        if (!selectedChild) return;
        try {
            const { data, error } = await supabase.functions.invoke("delete-student-account", {
                body: { studentId: selectedChild.id },
            });
            if (error) {
                const message = await getEdgeFunctionError(error, "Failed to delete account");
                throw new Error(message);
            }
            if (data?.error) throw new Error(data.error);
            toast.success(`${selectedChild.profile.full_name}'s account deleted`);
            setDeleteDialogOpen(false);
            if (parentUserId) fetchChildren(parentUserId);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to delete account");
        }
    };

    const filteredChildren = children.filter(child =>
        child.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        child.profile.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full space-y-6 sm:space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2d4b68] bg-[#0c2438] px-3 py-1 text-[11px] font-semibold text-[#58c4e8]">
                        <Users className="h-3.5 w-3.5" />
                        <span>Learner Management</span>
                    </div>
                    <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#71c9ed]">
                        My Children<span className="text-[#3bc2f3]">.</span>
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-400">
                        Manage student profiles, view comprehensive exam stats, and assign practice.
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                        onClick={() => navigate("/dashboard/parent")}
                        variant="outline"
                        className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 text-xs sm:text-sm"
                    >
                        <LayoutDashboard className="mr-1.5 h-4 w-4" />
                        Dashboard
                    </Button>
                    <Button
                        onClick={() => setAddChildOpen(true)}
                        className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs sm:text-sm"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add New Child
                    </Button>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 p-4 sm:p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Enrolled Children</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-2xl sm:text-3xl font-black text-white">{children.length}</p>
                        <p className="text-xs text-[#58c4e8]">Active</p>
                    </div>
                </Card>
                <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 p-4 sm:p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Premium Access</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-2xl sm:text-3xl font-black text-amber-400">{children.filter(c => c.is_premium).length}</p>
                        <p className="text-xs text-amber-400/70">VIP</p>
                    </div>
                </Card>
            </div>

            {/* Search and Filters */}
            <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search by name or username..."
                    className="pl-10 h-10 rounded-xl border border-[#26344d] bg-[#0d162a] text-xs sm:text-sm text-slate-200 placeholder:text-slate-400 focus:border-[#3bc2f3]/60 focus:ring-1 focus:ring-[#3bc2f3]/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Children Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {[1, 2].map(i => <div key={i} className="h-64 rounded-2xl bg-[#0c1628] animate-pulse border border-[#233148]" />)}
                </div>
            ) : filteredChildren.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                    {filteredChildren.map((child, index) => (
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
                                setSelectedChild(c);
                                setPaymentModalOpen(true);
                            }}
                            onDeleteChild={(c) => {
                                setSelectedChild(c);
                                setDeleteDialogOpen(true);
                            }}
                            onEditName={(c) => {
                                setSelectedChild(c);
                                setEditNameOpen(true);
                            }}
                            onEditUsername={(c) => {
                                setSelectedChild(c);
                                setEditUsernameOpen(true);
                            }}
                            onChangePassword={(c) => {
                                setSelectedChild(c);
                                setChangePasswordOpen(true);
                            }}
                        />
                    ))}
                </div>
            ) : (
                <Card className="rounded-[2.5rem] border-3 border-dashed border-border/60 bg-muted/20 p-20 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-2">
                        <Users className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-tight text-[#71c9ed]">No students found</h2>
                        <p className="text-muted-foreground font-medium max-w-xs mx-auto text-lg leading-relaxed">
                            {searchQuery ? "Try a different search term or clear the filter." : "Start by adding your first child to track their progress."}
                        </p>
                    </div>
                    {!searchQuery && (
                        <Button onClick={() => setAddChildOpen(true)} variant="hero" className="rounded-2xl h-14 px-8 font-black text-lg shadow-xl shadow-primary/20">
                            <Plus className="mr-2 h-6 w-6" />
                            Add First Child
                        </Button>
                    )}
                </Card>
            )}

            {/* Dialogs */}
            <StudentReportDialog
                open={reportOpen}
                onOpenChange={setReportOpen}
                studentId={selectedChild?.id || ""}
                studentName={selectedChild?.profile.full_name || ""}
                studentClass={selectedChild?.class_year === "year_6" ? "Year 6" : "Year 9"}
                avatar={selectedChild?.profile.full_name?.charAt(0)}
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
                onSuccess={() => parentUserId && fetchChildren(parentUserId)}
            />

            <DummyPaymentModal
                open={paymentModalOpen}
                onOpenChange={setPaymentModalOpen}
                studentId={selectedChild?.id || ""}
                studentName={selectedChild?.profile.full_name || ""}
                onSuccess={() => parentUserId && fetchChildren(parentUserId)}
            />

            <DeleteChildDialog
                isOpen={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                child={selectedChild}
                onConfirm={handleDeleteChild}
                isDeleting={false}
            />

            <EditChildNameDialog
                open={editNameOpen}
                onOpenChange={setEditNameOpen}
                child={selectedChild}
                onSuccess={() => parentUserId && fetchChildren(parentUserId)}
            />

            <EditChildUsernameDialog
                open={editUsernameOpen}
                onOpenChange={setEditUsernameOpen}
                child={selectedChild ? { id: selectedChild.id, profile: { username: selectedChild.profile.username } } : null}
                onSuccess={() => parentUserId && fetchChildren(parentUserId)}
            />

            <ChangeChildPasswordDialog
                open={changePasswordOpen}
                onOpenChange={setChangePasswordOpen}
                child={selectedChild}
            />
        </div>
    );
}
