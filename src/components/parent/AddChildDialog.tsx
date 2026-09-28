import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionError } from "@/lib/errorUtils";
import { Eye, EyeOff } from "lucide-react";

interface AddChildDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parentId: string | null;
    onSuccess: () => void;
}

export function AddChildDialog({ open, onOpenChange, parentId, onSuccess }: AddChildDialogProps) {
    const [isAddingChild, setIsAddingChild] = useState(false);
    const [newChildData, setNewChildData] = useState({
        fullName: "",
        classYear: "",
        username: "",
        password: "",
    });
    const [createdChildCredentials, setCreatedChildCredentials] = useState<{ username: string; password: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleCreateChild = async () => {
        if (!newChildData.fullName || !newChildData.classYear || !newChildData.username || !newChildData.password) {
            toast.error("Please fill in all fields");
            return;
        }

        if (newChildData.username.length < 2 || newChildData.username.length > 20) {
            toast.error("Username must be between 2 and 20 characters");
            return;
        }

        if (/\s/.test(newChildData.username)) {
            toast.error("Username cannot contain spaces");
            return;
        }

        if (newChildData.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        if (!parentId) {
            toast.error("Parent profile not found");
            return;
        }

        setIsAddingChild(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("No session found");

            const { data, error } = await supabase.functions.invoke("create-student-account", {
                body: newChildData,
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) {
                const message = await getEdgeFunctionError(error, "Failed to create student account");
                throw new Error(message);
            }

            if (data?.error) throw new Error(data.error);

            toast.success("Student account created successfully!");
            setCreatedChildCredentials({ username: newChildData.username.trim().toLowerCase(), password: newChildData.password });
            onSuccess();
        } catch (error: unknown) {
            console.error("Error creating student account:", error);
            toast.error(error instanceof Error ? error.message : "Failed to create student account");
        } finally {
            setIsAddingChild(false);
        }
    };

    const handleClose = () => {
        setNewChildData({
            fullName: "",
            classYear: "",
            username: "",
            password: "",
        });
        setCreatedChildCredentials(null);
        setShowPassword(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[440px] bg-[#0c1628] border border-[#233148] text-slate-100 rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">
                        {createdChildCredentials ? "Student Account Created" : "Create Student Account"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs sm:text-sm">
                        {createdChildCredentials
                            ? "Please save these login credentials. Your child will need them to log in."
                            : "Create a new student account for your child."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    {createdChildCredentials ? (
                        <div className="space-y-4 p-5 bg-[#080f22] rounded-xl border border-[#202b43]">
                            <div>
                                <Label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Username</Label>
                                <p className="font-mono text-lg font-bold text-[#71c9ed] mt-0.5">{createdChildCredentials.username}</p>
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Password</Label>
                                <p className="font-mono text-lg font-bold text-[#71c9ed] mt-0.5">{createdChildCredentials.password}</p>
                            </div>
                            <Button
                                className="w-full mt-4 bg-[#3bc2f3] text-slate-950 hover:bg-[#32ade0] font-bold rounded-xl h-11"
                                onClick={handleClose}
                            >
                                Done
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-slate-300">Full Name</Label>
                                <Input
                                    id="fullName"
                                    placeholder="e.g. Ada Okafor"
                                    value={newChildData.fullName}
                                    onChange={(e) => setNewChildData({ ...newChildData, fullName: e.target.value })}
                                    className="rounded-xl border border-[#233148] bg-[#080f22] text-slate-100 placeholder:text-slate-500 h-11 focus-visible:border-[#3bc2f3]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="classYear" className="text-xs font-semibold uppercase tracking-wider text-slate-300">Class Year</Label>
                                <select
                                    id="classYear"
                                    className="flex h-11 w-full rounded-xl border border-[#233148] bg-[#080f22] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-[#3bc2f3] transition-all"
                                    value={newChildData.classYear}
                                    onChange={(e) => setNewChildData({ ...newChildData, classYear: e.target.value })}
                                >
                                    <option value="" disabled className="bg-[#0c1628] text-slate-400">Select Class Year</option>
                                    <option value="year_6" className="bg-[#0c1628] text-slate-100">Year 6 (Primary 6)</option>
                                    <option value="year_9" className="bg-[#0c1628] text-slate-100">Year 9 (JSS 3)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-slate-300">Student Username</Label>
                                <Input
                                    id="username"
                                    placeholder="e.g. ada.okafor"
                                    value={newChildData.username}
                                    onChange={(e) => setNewChildData({ ...newChildData, username: e.target.value })}
                                    className="rounded-xl border border-[#233148] bg-[#080f22] text-slate-100 placeholder:text-slate-500 h-11 focus-visible:border-[#3bc2f3]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-300">Student Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Minimum 6 characters"
                                        value={newChildData.password}
                                        onChange={(e) => setNewChildData({ ...newChildData, password: e.target.value })}
                                        className="rounded-xl border border-[#233148] bg-[#080f22] text-slate-100 placeholder:text-slate-500 h-11 pr-10 focus-visible:border-[#3bc2f3]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-3">
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                    className="flex-1 rounded-xl font-semibold border border-[#233148] bg-[#080f22] text-slate-200 hover:bg-[#15273f] hover:border-[#3bc2f3] hover:text-white h-11"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateChild}
                                    disabled={isAddingChild || !newChildData.fullName || !newChildData.classYear || !newChildData.username || !newChildData.password.trim()}
                                    className="flex-1 rounded-xl font-bold h-11 bg-[#3bc2f3] text-slate-950 hover:bg-[#32ade0] shadow-md shadow-cyan-500/10"
                                >
                                    {isAddingChild ? "Creating..." : "Create Account"}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
