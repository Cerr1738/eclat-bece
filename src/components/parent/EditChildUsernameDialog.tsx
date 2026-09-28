import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Fingerprint } from "lucide-react";
import { getEdgeFunctionError } from "@/lib/errorUtils";

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

interface EditChildUsernameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    child: { id: string; profile: { username?: string } } | null;
    onSuccess: () => void;
}

export function EditChildUsernameDialog({ open, onOpenChange, child, onSuccess }: EditChildUsernameDialogProps) {
    const [username, setUsername] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (child) {
            setUsername(child.profile.username || "");
        }
    }, [child, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!child || !username.trim()) return;

        const normalizedUsername = username.trim().toLowerCase();

        if (normalizedUsername.length < 2 || normalizedUsername.length > 20) {
            toast.error("Username must be between 2 and 20 characters");
            return;
        }

        if (normalizedUsername === child.profile.username?.toLowerCase()) {
            onOpenChange(false);
            return;
        }

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.functions.invoke("manage-student-account", {
                body: {
                    studentId: child.id,
                    action: "edit-username",
                    username: normalizedUsername,
                },
            });

            if (error) {
                const message = await getEdgeFunctionError(error, "Failed to update username");
                throw new Error(message);
            }
            if (data?.error) throw new Error(data.error);

            toast.success("Username updated successfully");
            onSuccess();
            onOpenChange(false);
        } catch (error: unknown) {
            console.error("Error updating username:", error);
            toast.error(error instanceof Error ? error.message : "Failed to update username");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 shadow-2xl">
                <DialogHeader>
                    <div className="w-10 h-10 bg-[#0c2438] text-[#58c4e8] rounded-xl flex items-center justify-center mb-2">
                        <Fingerprint className="w-5 h-5" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-white">Edit Username</DialogTitle>
                    <DialogDescription className="font-medium text-slate-400 text-xs sm:text-sm">
                        Change your child's login username. It must be unique.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Username
                        </Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                            placeholder="e.g. jdoe123"
                            className="h-11 rounded-xl border border-[#233148] bg-[#080f22] text-slate-100 placeholder:text-slate-500 font-mono focus-visible:border-[#3bc2f3] lowercase"
                            required
                        />
                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 px-1">
                            Username must be 2-20 characters, lowercase, and contain no spaces.
                        </p>
                    </div>
                    <DialogFooter className="pt-2 flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl font-semibold border border-[#233148] bg-[#080f22] text-slate-200 hover:bg-[#15273f] hover:border-[#3bc2f3] hover:text-white h-11 px-5"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !username.trim() || username.trim().toLowerCase() === child?.profile.username?.toLowerCase()}
                            className="rounded-xl font-bold h-11 px-6 bg-[#3bc2f3] text-slate-950 hover:bg-[#32ade0] shadow-md shadow-cyan-500/10"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                "Update Username"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
