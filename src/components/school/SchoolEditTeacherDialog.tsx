import { useState, useEffect } from "react";
import { Briefcase, Mail, Phone, Trash2, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolTeacherItem } from "@/hooks/useSchoolData";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionError } from "@/lib/errorUtils";
import { toast } from "sonner";

interface SchoolEditTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: SchoolTeacherItem | null;
  /** Only lead_teacher is needed here (to clear it on delete). */
  classes: Array<{ id: string; lead_teacher: string | null }>;
  schoolId: string;
  onSaved?: () => void;
}

export function SchoolEditTeacherDialog({
  open,
  onOpenChange,
  teacher,
  classes,
  schoolId,
  onSaved,
}: SchoolEditTeacherDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"Active" | "On Leave" | "Inactive">("Active");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [localUserId, setLocalUserId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (teacher) {
      setFullName(teacher.full_name || "");
      setEmail(teacher.email || "");
      setPhone(teacher.phone || "");
      setStatus(teacher.status || "Active");
      setLocalUserId((teacher as { user_id?: string | null } | null)?.user_id ?? null);
      setEmailError(null);
      setEmailChecking(false);
      setEmailAvailable(null);
    }
  }, [teacher]);

  if (!teacher) return null;

  const teacherUserId = localUserId ?? (teacher as { user_id?: string | null } | null)?.user_id ?? null;
  const isVirtual = teacher.id.startsWith("virtual-");

  const checkEmailAvailability = async (emailVal: string) => {
    const trimmed = emailVal.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setEmailError(null);
      setEmailAvailable(null);
      return;
    }

    setEmailChecking(true);
    try {
      const { data, error } = await supabase.rpc("check_teacher_email_availability", {
        check_email: trimmed,
        exclude_teacher_id: isVirtual ? undefined : teacher.id,
      });
      if (error) throw error;
      if (data && typeof data === "object") {
        const res = data as { available: boolean; message?: string };
        if (!res.available) {
          setEmailError(res.message || "This email is not available");
          setEmailAvailable(false);
        } else {
          setEmailError(null);
          setEmailAvailable(true);
        }
      }
    } catch (err) {
      console.error("Error checking email availability:", err);
    } finally {
      setEmailChecking(false);
    }
  };

  const handleProvisionLogin = async () => {
    if (isVirtual) {
      toast.error("Save this teacher first, then create their login.");
      return;
    }
    const loginEmail = email.trim().toLowerCase();
    if (!loginEmail) {
      toast.error("An email address is required to create a login.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    // Pre-flight check email availability
    const { data: availData } = await supabase.rpc("check_teacher_email_availability", {
      check_email: loginEmail,
      exclude_teacher_id: teacher.id,
    });
    if (availData && typeof availData === "object" && !(availData as { available: boolean }).available) {
      const msg = (availData as { message?: string }).message || "This email address is not available";
      setEmailError(msg);
      toast.error(msg);
      return;
    }

    setIsProvisioning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isReset = !!teacherUserId;
      const { error } = await supabase.functions.invoke("create-teacher-account", {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
        body: isReset
          ? { action: "reset-password", teacher_id: teacher.id, password: newPassword, new_password: newPassword }
          : { teacher_id: teacher.id, email: loginEmail, password: newPassword },
      });
      if (error) {
        const message = await getEdgeFunctionError(error, "Failed to provision teacher account");
        throw new Error(message);
      }
      toast.success(isReset ? "Teacher password updated!" : "Login account created!");
      setNewPassword("");
      setLocalUserId("provisioned");
      onSaved?.();
    } catch (err: any) {
      console.error("Error provisioning teacher login:", err);
      toast.error(err.message || "Failed to provision teacher account");
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleUpdate = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter the teacher's full name.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (newPassword && newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (cleanEmail) {
      // Pre-flight check email availability
      const { data: availData } = await supabase.rpc("check_teacher_email_availability", {
        check_email: cleanEmail,
        exclude_teacher_id: isVirtual ? undefined : teacher.id,
      });
      if (availData && typeof availData === "object" && !(availData as { available: boolean }).available) {
        const msg = (availData as { message?: string }).message || "This email address is not available";
        setEmailError(msg);
        toast.error(msg);
        return;
      }
    }

    setIsSaving(true);
    try {
      const profileUpdate = {
        full_name: fullName.trim(),
        email: cleanEmail || null,
        phone: phone.trim() || null,
        status,
      };

      let teacherRecordId = teacher.id;

      if (isVirtual) {
        // Promote virtual teacher to genuine school_teachers table
        const { data: inserted, error } = await supabase
          .from("school_teachers")
          .insert({
            school_id: schoolId,
            ...profileUpdate,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (inserted?.id) teacherRecordId = inserted.id;
      } else {
        // Update existing record
        const { error } = await supabase
          .from("school_teachers")
          .update(profileUpdate)
          .eq("id", teacher.id);
        if (error) throw error;
      }

      // If user typed a password into the login section, provision or reset login automatically
      if (newPassword && newPassword.length >= 6) {
        if (!cleanEmail) {
          toast.warning("Profile saved, but an email is required to create a teacher login.");
          onSaved?.();
          onOpenChange(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const isReset = !!teacherUserId;
        const { error: provError } = await supabase.functions.invoke("create-teacher-account", {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
          body: isReset
            ? { action: "reset-password", teacher_id: teacherRecordId, password: newPassword, new_password: newPassword }
            : { teacher_id: teacherRecordId, email: cleanEmail, password: newPassword },
        });

        if (provError) {
          const message = await getEdgeFunctionError(provError, "Failed to provision login");
          toast.warning(`Profile saved, but login could not be created: ${message}`);
          onSaved?.();
          return;
        }

        toast.success(isReset ? "Teacher profile & password updated!" : "Teacher profile saved and login created!");
        setNewPassword("");
        setLocalUserId("provisioned");
        onSaved?.();
        onOpenChange(false);
        return;
      }

      toast.success("Teacher profile updated successfully!");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating teacher:", err);
      toast.error(err.message || "Failed to update teacher");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove ${teacher.full_name} from the teacher directory?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      if (!isVirtual) {
        const { error } = await supabase
          .from("school_teachers")
          .delete()
          .eq("id", teacher.id);
        if (error) throw error;
      }

      // If assigned as lead_teacher on classes, clear that lead_teacher
      for (const cls of classes) {
        if (cls.lead_teacher && cls.lead_teacher.trim().toLowerCase() === teacher.full_name.trim().toLowerCase()) {
          await supabase
            .from("school_classes")
            .update({ lead_teacher: null })
            .eq("id", cls.id);
        }
      }

      toast.success("Teacher removed from directory.");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error deleting teacher:", err);
      toast.error(err.message || "Failed to delete teacher");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground w-[95vw] sm:max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b border-[#1f2b42] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-[#3bc2f3] border border-sky-500/20">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">Edit Faculty Profile</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update departmental allocations, contact details, and assigned class arms.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4 text-xs">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-xs text-muted-foreground font-semibold">
              Full Name & Title *
            </Label>
            <Input
              id="edit-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border-[#34415b] bg-background text-white text-xs h-9"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-email" className="text-xs text-muted-foreground font-semibold">
                Email Address
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                  setEmailAvailable(null);
                }}
                onBlur={() => checkEmailAvailability(email)}
                placeholder="teacher@school.edu"
                className={`border-[#34415b] bg-background text-white text-xs h-9 ${
                  emailError ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
              {emailChecking && (
                <p className="text-[10px] text-muted-foreground animate-pulse">Checking email availability...</p>
              )}
              {emailError && (
                <p className="text-[10px] text-destructive font-medium leading-tight">{emailError}</p>
              )}
              {emailAvailable && !emailError && (
                <p className="text-[10px] text-emerald-400 font-medium">✓ Email is available</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-xs text-muted-foreground font-semibold">
                Phone Number
              </Label>
              <Input
                id="edit-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 803 123 4567"
                className="border-[#34415b] bg-background text-white text-xs h-9"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-status" className="text-xs text-muted-foreground font-semibold">
              Faculty Status
            </Label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-9 w-full rounded-lg border border-[#34415b] bg-background px-3 text-xs text-white"
            >
              <option value="Active">Active Duty</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive / Past Faculty</option>
            </select>
          </div>

          {/* Teacher Login Access */}
          {!isVirtual && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-foreground">Teacher Portal Login</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {teacherUserId
                      ? "This teacher has an active login account."
                      : "No login yet — create one so this teacher can assign tasks."}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    teacherUserId
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-amber-500/15 text-amber-500"
                  }`}
                >
                  {teacherUserId ? "Active" : "No account"}
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={teacherUserId ? "New password (min 6 chars)" : "Temporary password (min 6 chars)"}
                  className="border-[#34415b] bg-background text-white text-xs h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isProvisioning || newPassword.length < 6 || !!emailError || emailChecking}
                  onClick={handleProvisionLogin}
                  className="text-xs"
                >
                  {isProvisioning && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {teacherUserId ? "Reset password" : "Create login"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#1f2b42] pt-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete Faculty
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#34415b] text-muted-foreground hover:text-white text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isSaving || !!emailError || emailChecking}
              className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-bold text-xs disabled:opacity-50"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SchoolEditTeacherDialog;
