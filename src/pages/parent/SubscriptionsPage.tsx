import { useState, useEffect } from "react";
import { CreditCard, LayoutDashboard, Zap, CheckCircle2, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DummyPaymentModal } from "@/components/parent/DummyPaymentModal";
import { format } from "date-fns";

interface LinkedChild {
    id: string;
    user_id: string;
    class_year: string;
    is_premium: boolean;
    profile: {
        full_name: string | null;
        unique_id: string;
        username: string | null;
    };
}

interface Subscription {
    id: string;
    student_id: string;
    plan: string;
    status: string;
    amount: number;
    currency: string;
    started_at: string;
    expires_at: string | null;
}

const STANDARD_FEATURES = [
    "Access to core question bank",
    "50 questions per practice session",
    "Basic subject coverage",
    "Parent progress overview",
];

const PREMIUM_FEATURES = [
    "Unlimited practice questions",
    "Full analytics & performance reports",
    "All subjects including comprehension",
    "Detailed topic-level breakdown",
    "Priority support badge",
    "Leaderboard access",
];

export default function SubscriptionsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [children, setChildren] = useState<LinkedChild[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [parentId, setParentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedChild, setSelectedChild] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const { data: parentData } = await supabase
                    .from("parents")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();

                if (!parentData) return;
                setParentId(parentData.id);

                const [childrenResult, subsResult] = await Promise.all([
                    supabase
                        .from("students")
                        .select("id, user_id, class_year, is_premium, profile:profiles(full_name, unique_id, username)")
                        .eq("parent_id", parentData.id),
                    supabase
                        .from("subscriptions")
                        .select("*")
                        .eq("parent_id", parentData.id)
                        .eq("status", "active"),
                ]);

                if (childrenResult.data) setChildren(childrenResult.data as unknown as LinkedChild[]);
                if (subsResult.data) setSubscriptions(subsResult.data as Subscription[]);
            } catch (err) {
                console.error("Error loading subscriptions:", err);
                toast.error("Failed to load subscription data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const refetch = async () => {
        if (!parentId) return;
        const [childrenResult, subsResult] = await Promise.all([
            supabase
                .from("students")
                .select("id, user_id, class_year, is_premium, profile:profiles(full_name, unique_id, username)")
                .eq("parent_id", parentId),
            supabase
                .from("subscriptions")
                .select("*")
                .eq("parent_id", parentId)
                .eq("status", "active"),
        ]);
        if (childrenResult.data) setChildren(childrenResult.data as unknown as LinkedChild[]);
        if (subsResult.data) setSubscriptions(subsResult.data as Subscription[]);
    };

    const getSubscription = (studentId: string) =>
        subscriptions.find((s) => s.student_id === studentId);

    const classLabel = (cy: string) =>
        cy === "year_6" ? "Year 6" : cy === "year_9" ? "Year 9" : cy;

    const premiumCount = children.filter((c) => c.is_premium).length;

    return (
        <div className="w-full space-y-6 sm:space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2d4b68] bg-[#0c2438] px-3 py-1 text-[11px] font-semibold text-[#58c4e8]">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Billing &amp; Access</span>
                    </div>
                    <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#71c9ed]">
                        My Subscriptions<span className="text-[#3bc2f3]">.</span>
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-400">
                        Manage premium access for your children, view active subscription dates, and invoices.
                    </p>
                </div>
                <Button
                    onClick={() => navigate("/dashboard/parent")}
                    variant="outline"
                    className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 text-xs sm:text-sm"
                >
                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                    Dashboard
                </Button>
            </div>

            {/* Summary Metric */}
            {!isLoading && children.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 p-4 sm:p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Children</p>
                        <p className="mt-1 text-2xl sm:text-3xl font-black text-white">{children.length}</p>
                        <p className="text-xs text-[#58c4e8] mt-0.5">Enrolled</p>
                    </Card>
                    <Card className="rounded-2xl border border-[#4c3a1b] bg-[#1a160d] text-slate-100 p-4 sm:p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Premium</p>
                        <p className="mt-1 text-2xl sm:text-3xl font-black text-amber-400">{premiumCount}</p>
                        <p className="text-xs text-amber-400/70 mt-0.5">Full Access</p>
                    </Card>
                    <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 p-4 sm:p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Standard</p>
                        <p className="mt-1 text-2xl sm:text-3xl font-black text-slate-300">{children.length - premiumCount}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Core Practice</p>
                    </Card>
                </div>
            )}

            {/* Plan Comparison */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-1 bg-[#3bc2f3] rounded-full" />
                    <h2 className="text-lg sm:text-xl font-black text-[#71c9ed] tracking-tight">Available Plans</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Standard */}
                    <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 p-5 sm:p-6 flex flex-col justify-between">
                        <div>
                            <span className="rounded-full bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                                Standard Plan
                            </span>
                            <div className="mt-3">
                                <p className="text-2xl sm:text-3xl font-black text-white">Free</p>
                                <p className="text-xs text-slate-400 mt-0.5">Default account level for all learners</p>
                            </div>
                            <ul className="space-y-2.5 mt-5">
                                {STANDARD_FEATURES.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                                        <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Card>

                    {/* Premium */}
                    <Card className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-[#1f1910] via-[#141d2d] to-[#0c1628] text-slate-100 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
                        <div>
                            <span className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Premium VIP
                            </span>
                            <div className="mt-3 flex items-baseline gap-2">
                                <p className="text-2xl sm:text-3xl font-black text-white">₦15,000</p>
                                <span className="text-xs text-slate-400 font-medium">/ year per student</span>
                            </div>
                            <p className="text-xs text-amber-400/80 mt-0.5">All-inclusive BECE &amp; NCEE preparation</p>

                            <ul className="space-y-2.5 mt-5">
                                {PREMIUM_FEATURES.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-xs text-white">
                                        <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Children Status */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-1 bg-[#3bc2f3] rounded-full" />
                    <h2 className="text-lg sm:text-xl font-black text-[#71c9ed] tracking-tight">Student Access Details</h2>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-20 rounded-2xl bg-[#0c1628] animate-pulse border border-[#233148]" />
                        ))}
                    </div>
                ) : children.length === 0 ? (
                    <Card className="rounded-2xl border-2 border-dashed border-[#26344d] bg-[#0c1628] p-12 flex flex-col items-center text-center gap-3">
                        <CreditCard className="h-10 w-10 text-slate-500" />
                        <div>
                            <p className="text-base font-bold text-white">No children added yet</p>
                            <p className="text-slate-400 text-xs mt-0.5">Add a child profile first to manage their subscription.</p>
                        </div>
                        <Button
                            onClick={() => navigate("/dashboard/parent/children")}
                            className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs rounded-xl mt-2"
                        >
                            Go to My Children
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {children.map((child) => {
                            const initials = child.profile.full_name?.charAt(0).toUpperCase() || "?";
                            const sub = getSubscription(child.id);
                            return (
                                <Card
                                    key={child.id}
                                    className={`rounded-2xl border transition-all duration-200 ${child.is_premium
                                        ? "border-amber-500/30 bg-[#16141a] hover:border-amber-500/50"
                                        : "border-[#233148] bg-[#0c1628] hover:border-[#384c6e]"
                                        }`}
                                >
                                    <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${child.is_premium ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900" : "bg-[#0c2438] text-[#58c4e8]"}`}>
                                                {initials}
                                            </div>

                                            <div className="min-w-0 space-y-1">
                                                <p className="text-base font-bold text-white truncate">{child.profile.full_name || "Unknown"}</p>
                                                <div className="flex items-center flex-wrap gap-2 text-xs">
                                                    {child.is_premium ? (
                                                        <span className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                                                            <Zap className="h-3 w-3" /> Premium
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase">
                                                            Standard
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-bold text-[#58c4e8] bg-[#0c2438] border border-[#2d4b68] px-2 py-0.5 rounded-full uppercase">
                                                        {classLabel(child.class_year)}
                                                    </span>
                                                    {sub?.expires_at && (
                                                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                            <Calendar className="h-3 w-3 text-[#58c4e8]" />
                                                            Renews {format(new Date(sub.expires_at), "dd MMM yyyy")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            {!child.is_premium ? (
                                                <Button
                                                    className="w-full sm:w-auto bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-semibold text-xs rounded-xl h-9 px-4"
                                                    onClick={() => {
                                                        setSelectedChild({ id: child.id, name: child.profile.full_name || "Child" });
                                                        setPaymentModalOpen(true);
                                                    }}
                                                >
                                                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                                                    Upgrade to Premium
                                                </Button>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Active Premium Access
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <DummyPaymentModal
                open={paymentModalOpen}
                onOpenChange={setPaymentModalOpen}
                studentId={selectedChild?.id || ""}
                studentName={selectedChild?.name || ""}
                onSuccess={refetch}
            />
        </div>
    );
}
