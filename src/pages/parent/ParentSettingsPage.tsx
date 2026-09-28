import { useState, useEffect } from "react";
import { User as UserIcon, Lock, Settings, Copy, Check, Users, Bell, Loader2, Upload, Trash2, Eye, EyeOff, Sun, Moon, Laptop, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes";

const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
});

interface LinkedChild {
  id: string;
  class_year: string;
  is_premium: boolean;
  profile: {
    full_name: string | null;
    unique_id: string;
    username: string | null;
  } | null;
}

export default function ParentSettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabQuery = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(tabQuery);

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab && (currentTab === "profile" || currentTab === "security" || currentTab === "preferences")) {
      setActiveTab(currentTab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  
  // Loading states
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ displayName?: string }>({});

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Preference & Child fields
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [copied, setCopied] = useState(false);
  const [preferences, setPreferences] = useState({
    emailWeeklyDigest: true,
    activityAlerts: true,
    marketingUpdates: false
  });

  useEffect(() => {
    if (user) {
      loadParentData();
    }
  }, [user]);

  const loadParentData = async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      // 1. Fetch Profile Data
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, full_name, email, avatar_url, unique_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setDisplayName(profile.full_name || profile.display_name || "");
      setEmail(profile.email || "");
      setAvatarUrl(profile.avatar_url || "");
      setUniqueId(profile.unique_id || "");

      // 2. Fetch Parent and Children Data
      const { data: parent, error: parentError } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (parentError) throw parentError;
      setParentId(parent.id);

      // Fetch linked children
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          class_year,
          is_premium,
          profile:profiles(
            full_name,
            unique_id,
            username
          )
        `)
        .eq("parent_id", parent.id);

      if (studentsError) throw studentsError;
      
      // Map to correct types
      if (students) {
        setChildren(students as unknown as LinkedChild[]);
      }

    } catch (error: any) {
      console.error("Error loading parent data:", error);
      toast.error("Failed to load settings data");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];

    // File validation (Explicitly enforce the 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      event.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      event.target.value = "";
      return;
    }

    const previousAvatarUrl = avatarUrl;
    const localUrl = URL.createObjectURL(file);

    // Optimistically update the UI in real time immediately (no lag)
    setAvatarUrl(localUrl);
    window.dispatchEvent(new CustomEvent("profile-updated", { 
      detail: { avatar_url: localUrl } 
    }));

    setUploadingAvatar(true);
    try {
      // Remove old avatar path if exists in background
      if (previousAvatarUrl && !previousAvatarUrl.startsWith("blob:")) {
        const oldFileName = previousAvatarUrl.split("/").pop();
        if (oldFileName) {
          await supabase.storage
            .from("avatars")
            .remove([`${user.id}/${oldFileName}`])
            .catch(err => console.warn("Could not delete old avatar:", err));
        }
      }

      // Upload new avatar file
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile avatar url in DB
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update state with permanent public URL
      setAvatarUrl(publicUrl);
      window.dispatchEvent(new CustomEvent("profile-updated", { 
        detail: { avatar_url: publicUrl } 
      }));
      toast.success("Profile avatar updated successfully!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar image");
      
      // Revert optimistic updates on failure
      setAvatarUrl(previousAvatarUrl);
      window.dispatchEvent(new CustomEvent("profile-updated", { 
        detail: { avatar_url: previousAvatarUrl } 
      }));
    } finally {
      setUploadingAvatar(false);
      event.target.value = ""; // Reset file input
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !avatarUrl) return;
    const previousAvatarUrl = avatarUrl;

    // Optimistically update the UI in real time immediately (no lag)
    setAvatarUrl("");
    window.dispatchEvent(new CustomEvent("profile-updated", { 
      detail: { avatar_url: "" } 
    }));

    setUploadingAvatar(true);
    try {
      if (!previousAvatarUrl.startsWith("blob:")) {
        const fileName = previousAvatarUrl.split("/").pop();
        if (fileName) {
          await supabase.storage
            .from("avatars")
            .remove([`${user.id}/${fileName}`]);
        }
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Avatar image removed");
    } catch (error: any) {
      console.error("Error removing avatar:", error);
      toast.error("Failed to remove avatar");

      // Revert optimistic updates on failure
      setAvatarUrl(previousAvatarUrl);
      window.dispatchEvent(new CustomEvent("profile-updated", { 
        detail: { avatar_url: previousAvatarUrl } 
      }));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate inputs using Zod
    const validation = profileSchema.safeParse({ displayName });
    if (!validation.success) {
      const fieldErrors: { displayName?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === "displayName") fieldErrors.displayName = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSavingProfile(true);

    try {
      // 1. Update Profile Display Name and Full Name in db
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          display_name: displayName,
          full_name: displayName
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update layout header display name in real time
      window.dispatchEvent(new CustomEvent("profile-updated", { 
        detail: { full_name: displayName } 
      }));

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error saving profile details:", error);
      toast.error(error.message || "Failed to update profile details");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const copyConnectionCode = () => {
    navigator.clipboard.writeText(uniqueId);
    setCopied(true);
    toast.success("Connection code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const classLabel = (cy: string) =>
    cy === "year_6" ? "Year 6" : cy === "year_9" ? "Year 9" : cy;

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#3bc2f3]" />
        <p className="text-slate-400 font-medium animate-pulse">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 space-y-8 animate-fade-in text-slate-100">
      {/* Header section */}
      <div className="flex flex-col gap-1 pb-4 border-b border-[#202b43]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border border-[#2d4b68] bg-[#0c2438] text-[#58c4e8] w-fit mb-2">
          <Settings className="h-3.5 w-3.5" />
          <span>Parent Portal Settings</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#71c9ed] flex items-center gap-2">
          Account <span className="text-[#3bc2f3]">Settings</span>
          <span className="w-2 h-2 rounded-full bg-[#3bc2f3]" />
        </h1>
        <p className="text-slate-400 font-medium text-sm">
          Manage your personal details, secure your account, and configure dashboard preferences.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-[#0c1628] p-1.5 rounded-2xl flex flex-row flex-nowrap overflow-x-auto no-scrollbar w-full sm:w-fit gap-1.5 border border-[#233148] h-auto shrink-0">
          <TabsTrigger 
            value="profile" 
            className="rounded-xl font-bold py-2.5 px-5 flex-1 sm:flex-initial whitespace-nowrap transition-all duration-200 data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-[#3bc2f3] data-[state=active]:!to-[#0c9dcc] data-[state=active]:!text-slate-950 data-[state=active]:!shadow-md text-slate-400 hover:text-white hover:bg-[#15233c] flex items-center justify-center shrink-0"
          >
            <UserIcon className="h-4 w-4 mr-2 shrink-0" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="rounded-xl font-bold py-2.5 px-5 flex-1 sm:flex-initial whitespace-nowrap transition-all duration-200 data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-[#3bc2f3] data-[state=active]:!to-[#0c9dcc] data-[state=active]:!text-slate-950 data-[state=active]:!shadow-md text-slate-400 hover:text-white hover:bg-[#15233c] flex items-center justify-center shrink-0"
          >
            <Lock className="h-4 w-4 mr-2 shrink-0" />
            Security
          </TabsTrigger>
          <TabsTrigger 
            value="preferences" 
            className="rounded-xl font-bold py-2.5 px-5 flex-1 sm:flex-initial whitespace-nowrap transition-all duration-200 data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-[#3bc2f3] data-[state=active]:!to-[#0c9dcc] data-[state=active]:!text-slate-950 data-[state=active]:!shadow-md text-slate-400 hover:text-white hover:bg-[#15233c] flex items-center justify-center shrink-0"
          >
            <Users className="h-4 w-4 mr-2 shrink-0" />
            Children & Preferences
          </TabsTrigger>
        </TabsList>

        {/* Profile Details Tab Content */}
        <TabsContent value="profile" className="space-y-6 animate-in fade-in-50 duration-300">
          <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 overflow-hidden shadow-sm">
            <CardHeader className="pb-4 border-b border-[#202b43]">
              <CardTitle className="text-xl sm:text-2xl font-bold text-[#71c9ed]">Profile Details</CardTitle>
              <CardDescription className="text-slate-400 text-xs sm:text-sm">
                Update your display name, profile avatar, and email settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Profile Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-[#080f22] border border-[#202b43]">
                <Avatar className="h-20 w-20 border-2 border-[#3bc2f3]/40 shadow-md">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-[#0c2438] text-[#58c4e8] text-2xl font-black">
                    {displayName ? displayName.substring(0, 2).toUpperCase() : <UserIcon className="h-8 w-8 text-slate-400" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col gap-2.5 items-center sm:items-start">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#71c9ed]">Profile Avatar Image</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-semibold border border-[#233148] bg-[#0c1628] text-slate-200 hover:bg-[#15273f] hover:border-[#3bc2f3] hover:text-white h-9"
                      onClick={() => document.getElementById("avatar-input")?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#3bc2f3]" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4 text-[#58c4e8]" />
                          Upload New File
                        </>
                      )}
                    </Button>
                    <input
                      id="avatar-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />

                    {avatarUrl && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-xl font-bold h-9 bg-rose-600/20 text-rose-300 border border-rose-600/30 hover:bg-rose-600/40"
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Supports JPG, PNG, GIF. Max file size: 5MB.
                  </p>
                </div>
              </div>

              {/* Personal Details Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="displayName" className="font-semibold text-sm text-slate-200">Full Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your full name"
                    className="rounded-xl border border-[#233148] bg-[#080f22] text-slate-100 placeholder:text-slate-500 h-11 font-medium focus-visible:border-[#3bc2f3]"
                    maxLength={100}
                  />
                  {errors.displayName && (
                    <p className="text-xs font-semibold text-rose-400">{errors.displayName}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email" className="font-semibold text-sm text-slate-200">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="rounded-xl border border-[#202b43] bg-[#060c1c] text-slate-400 h-11 font-medium cursor-not-allowed opacity-80"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl font-bold h-11 px-6 bg-[#3bc2f3] text-slate-950 hover:bg-[#32ade0] shadow-md shadow-cyan-500/10 mt-2"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    "Save Profile Details"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab Content */}
        <TabsContent value="security" className="space-y-6 animate-in fade-in-50 duration-300">
          <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 overflow-hidden shadow-sm">
            <CardHeader className="pb-4 border-b border-[#202b43]">
              <CardTitle className="text-xl sm:text-2xl font-bold text-[#71c9ed]">Change Password</CardTitle>
              <CardDescription className="text-slate-400 text-xs sm:text-sm">
                Ensure your account is protected by setting a strong password.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-password" className="font-semibold text-sm text-slate-200">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="rounded-xl border border-[#233148] bg-[#080f22] text-slate-100 placeholder:text-slate-500 h-11 pr-10 font-medium focus-visible:border-[#3bc2f3]"
                      required
                      minLength={6}
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

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password" className="font-semibold text-sm text-slate-200">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      className="rounded-xl border border-[#233148] bg-[#080f22] text-slate-100 placeholder:text-slate-500 h-11 pr-10 font-medium focus-visible:border-[#3bc2f3]"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="rounded-xl font-bold h-11 px-6 bg-[#3bc2f3] text-slate-950 hover:bg-[#32ade0] shadow-md shadow-cyan-500/10 mt-2"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Children & Preferences Tab Content */}
        <TabsContent value="preferences" className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Appearance & Theme Preference Card */}
          <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 overflow-hidden shadow-sm">
            <CardHeader className="pb-4 border-b border-[#202b43]">
              <CardTitle className="text-xl sm:text-2xl font-bold text-[#71c9ed] flex items-center gap-2">
                <Palette className="h-5 w-5 text-[#3bc2f3]" />
                Appearance & Theme
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs sm:text-sm">
                Customize how Éclat looks on your screen. Choose between light, dark, or follow your system theme.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Label className="font-semibold text-sm text-slate-200">Theme Preference</Label>
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  <Button
                    type="button"
                    variant={theme === "light" ? "default" : "outline"}
                    className={`flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl transition-all ${
                      theme === "light"
                        ? "bg-[#3bc2f3] text-slate-950 font-bold shadow-md shadow-cyan-500/20 hover:bg-[#32ade0]"
                        : "border-[#233148] bg-[#080f22] text-slate-300 hover:text-white hover:bg-[#15233c] hover:border-[#3bc2f3]"
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-5 w-5 text-amber-400" />
                    <span className="text-xs font-semibold">Light</span>
                  </Button>
                  <Button
                    type="button"
                    variant={theme === "dark" ? "default" : "outline"}
                    className={`flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl transition-all ${
                      theme === "dark"
                        ? "bg-[#3bc2f3] text-slate-950 font-bold shadow-md shadow-cyan-500/20 hover:bg-[#32ade0]"
                        : "border-[#233148] bg-[#080f22] text-slate-300 hover:text-white hover:bg-[#15233c] hover:border-[#3bc2f3]"
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-5 w-5 text-[#3bc2f3]" />
                    <span className="text-xs font-semibold">Dark</span>
                  </Button>
                  <Button
                    type="button"
                    variant={theme === "system" ? "default" : "outline"}
                    className={`flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl transition-all ${
                      theme === "system"
                        ? "bg-[#3bc2f3] text-slate-950 font-bold shadow-md shadow-cyan-500/20 hover:bg-[#32ade0]"
                        : "border-[#233148] bg-[#080f22] text-slate-300 hover:text-white hover:bg-[#15233c] hover:border-[#3bc2f3]"
                    }`}
                    onClick={() => setTheme("system")}
                  >
                    <Laptop className="h-5 w-5 text-slate-400" />
                    <span className="text-xs font-semibold">System</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connection Code Box */}
          <Card className="rounded-2xl border border-[#2d4b68] bg-[#0c1628] text-slate-100 overflow-hidden shadow-sm relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#3bc2f3]/10 rounded-full blur-3xl -translate-y-8 translate-x-8" />
            <CardHeader className="pb-3 border-b border-[#202b43]">
              <CardTitle className="text-xl sm:text-2xl font-bold text-[#71c9ed] flex items-center gap-2">
                Your Parent Link Code
                <span className="w-2 h-2 rounded-full bg-[#3bc2f3]" />
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs sm:text-sm">
                Your children can use this code during registration or from their profile settings to connect to your parent portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10 pt-6">
              <div className="flex max-w-sm gap-2">
                <div className="flex-1 flex items-center justify-center h-12 bg-[#080f22] border border-dashed border-[#31506c] rounded-xl px-4 select-all">
                  <span className="font-mono text-xl font-bold tracking-[0.25em] text-[#71c9ed]">{uniqueId}</span>
                </div>
                <Button
                  onClick={copyConnectionCode}
                  variant="outline"
                  className="rounded-xl border border-[#2d4b68] bg-[#080f22] hover:bg-[#15273f] hover:border-[#3bc2f3] text-slate-200 font-bold h-12 w-12 p-0 flex items-center justify-center shrink-0"
                >
                  {copied ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5 text-[#58c4e8]" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Linked Children */}
          <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 overflow-hidden shadow-sm">
            <CardHeader className="pb-4 border-b border-[#202b43]">
              <CardTitle className="text-xl sm:text-2xl font-bold text-[#71c9ed]">Linked Children</CardTitle>
              <CardDescription className="text-slate-400 text-xs sm:text-sm">
                Children currently linked to your parent portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {children.length === 0 ? (
                <div className="p-8 text-center bg-[#080f22] border border-dashed border-[#202b43] rounded-2xl text-slate-400 font-medium text-sm">
                  No children linked yet. Share your connection code to link their account.
                </div>
              ) : (
                <div className="space-y-3">
                  {children.map((child) => {
                    const initials = child.profile?.full_name?.charAt(0).toUpperCase() || "?";
                    return (
                      <div
                        key={child.id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-[#202b43] bg-[#080f22] hover:border-[#3bc2f3]/40 transition-colors"
                      >
                        <Avatar className={`h-11 w-11 font-black shrink-0 ${child.is_premium ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-[#3bc2f3] to-[#0c9dcc]"}`}>
                          <AvatarFallback className="text-slate-950 text-base font-black">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{child.profile?.full_name || "Unknown Name"}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-[#58c4e8] uppercase">
                              {classLabel(child.class_year)}
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs text-slate-400 font-medium">
                              @{child.profile?.username || "no-username"}
                            </span>
                          </div>
                        </div>
                        {child.is_premium ? (
                          <Badge className="bg-[#352813] text-[#ffca6a] border border-[#5a421b] uppercase font-bold text-[10px]">
                            Premium
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-[#233148] text-slate-400 uppercase font-bold text-[10px]">Standard</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="rounded-2xl border border-[#233148] bg-[#0c1628] text-slate-100 overflow-hidden shadow-sm">
            <CardHeader className="pb-4 border-b border-[#202b43]">
              <CardTitle className="text-xl sm:text-2xl font-bold text-[#71c9ed]">Notification Preferences</CardTitle>
              <CardDescription className="text-slate-400 text-xs sm:text-sm">
                Choose how you want to be updated about your child's progress.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#080f22] border border-[#202b43]">
                <div className="space-y-0.5 pr-4">
                  <p className="font-bold text-sm text-white">Weekly Digest Email</p>
                  <p className="text-xs text-slate-400 font-medium">Receive a weekly summary email detailing your child's score improvements and completed assignments.</p>
                </div>
                <Switch
                  checked={preferences.emailWeeklyDigest}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailWeeklyDigest: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[#080f22] border border-[#202b43]">
                <div className="space-y-0.5 pr-4">
                  <p className="font-bold text-sm text-white">Real-time Activity Alerts</p>
                  <p className="text-xs text-slate-400 font-medium">Get notifications immediately when your child finishes a practice quiz or receives an assignment.</p>
                </div>
                <Switch
                  checked={preferences.activityAlerts}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, activityAlerts: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[#080f22] border border-[#202b43]">
                <div className="space-y-0.5 pr-4">
                  <p className="font-bold text-sm text-white">Educational & Marketing News</p>
                  <p className="text-xs text-slate-400 font-medium">Receive occasional emails with resources, tips, and new product updates.</p>
                </div>
                <Switch
                  checked={preferences.marketingUpdates}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, marketingUpdates: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
