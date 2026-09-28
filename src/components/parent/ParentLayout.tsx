import { ReactNode, useEffect, useState } from "react";
import { LayoutDashboard, Users, CreditCard, HelpCircle, Bell, Settings, LogOut, User as UserIcon, KeyRound, Copy, Check } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ParentSidebar } from "./ParentSidebar";
import { useTheme } from "next-themes";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParentLayoutProps {
    children: ReactNode;
}

export function ParentLayout({ children }: ParentLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut, user } = useAuth();
    const { theme, resolvedTheme } = useTheme();
    const logo = theme === "dark" ? logoLight : logoDark;

    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [uniqueId, setUniqueId] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchParentProfile = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("display_name, full_name, email, avatar_url, unique_id")
                    .eq("id", user.id)
                    .single();

                if (error) throw error;
                if (data) {
                    setDisplayName(data.full_name || data.display_name || data.email || "Parent");
                    setEmail(data.email || "");
                    setAvatarUrl(data.avatar_url || "");
                    setUniqueId(data.unique_id || "");
                }
            } catch (err) {
                console.error("Error fetching parent profile in layout:", err);
            }
        };

        fetchParentProfile();
    }, [user]);

    useEffect(() => {
        const handleProfileUpdate = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail) {
                if (customEvent.detail.avatar_url !== undefined) {
                    setAvatarUrl(customEvent.detail.avatar_url);
                }
                if (customEvent.detail.full_name !== undefined) {
                    setDisplayName(customEvent.detail.full_name);
                }
            }
        };

        window.addEventListener("profile-updated", handleProfileUpdate);
        return () => {
            window.removeEventListener("profile-updated", handleProfileUpdate);
        };
    }, []);

    const handleCopyCode = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (uniqueId) {
            navigator.clipboard.writeText(uniqueId);
            setCopied(true);
            toast.success("Connection code copied!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const navItems = [
        { title: "Dashboard", url: "/dashboard/parent", icon: LayoutDashboard },
        { title: "Children", url: "/dashboard/parent/children", icon: Users },
        { title: "Billing", url: "/dashboard/parent/subscriptions", icon: CreditCard },
        { title: "Resources", url: "/dashboard/parent/resources", icon: HelpCircle },
    ];

    const currentPath = location.pathname + location.hash;
    const isActive = (url: string) => currentPath === url;

    return (
        <SidebarProvider>
            <div data-parent-theme={resolvedTheme === "dark" ? "dark" : "light"} className="min-h-screen flex w-full bg-[#080f22] text-slate-100 dashboard-theme">
                <ParentSidebar />

                <div className="flex-1 flex flex-col relative min-w-0">
                    <header className="sticky top-0 z-40 border-b border-[#202b43] bg-[#080f22]/95 backdrop-blur-xl">
                        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6">
                            <div className="flex items-center gap-4">
                                <SidebarTrigger className="md:hidden text-slate-300 hover:text-white hover:bg-[#15233c] transition-colors" />
                                <img
                                    src={logo}
                                    alt="Éclat Logo"
                                    className="h-8 w-auto cursor-pointer opacity-90 transition hover:opacity-100"
                                    onClick={() => navigate("/")}
                                />
                            </div>

                            <div className="flex items-center gap-2 sm:gap-4">
                                <div className="hidden items-center rounded-full border border-[#26344d] bg-[#0d162a] px-3 py-1.5 sm:flex">
                                    <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Role</span>
                                    <span className="rounded-full bg-[#0c2438] border border-[#2d4b68] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#58c4e8]">Parent</span>
                                </div>
                                <NotificationBell />
                                <ThemeToggle />

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 overflow-hidden rounded-full border border-[#26344d] p-0 transition hover:border-[#384c6e] sm:h-10 sm:w-10"
                                        >
                                            <Avatar className="h-full w-full">
                                                <AvatarImage src={avatarUrl} alt={displayName} />
                                                <AvatarFallback className="bg-[#172338] text-sm font-bold text-[#58c4e8]">
                                                    {displayName ? displayName.substring(0, 2).toUpperCase() : <UserIcon className="h-4 w-4" />}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 rounded-2xl border border-[#233148] bg-[#0c1628] p-2 text-slate-100 shadow-2xl">
                                        <DropdownMenuLabel className="px-2.5 py-2 font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="truncate text-sm font-black text-white">{displayName}</p>
                                                <p className="truncate text-xs font-medium text-slate-400">{email}</p>
                                                <span className="mt-1 w-fit rounded-full bg-[#0c2438] border border-[#2d4b68] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#58c4e8]">
                                                    Parent Account
                                                </span>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="my-1.5 bg-[#202b43]" />
                                        <DropdownMenuItem onClick={() => navigate("/dashboard/parent/settings")} className="cursor-pointer rounded-xl py-2 font-bold text-slate-200 hover:bg-[#172338] hover:text-white">
                                            <Settings className="mr-2 h-4 w-4 text-slate-400" />
                                            <span>Profile Settings</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate("/dashboard/parent/settings?tab=security")} className="cursor-pointer rounded-xl py-2 font-bold text-slate-200 hover:bg-[#172338] hover:text-white">
                                            <KeyRound className="mr-2 h-4 w-4 text-slate-400" />
                                            <span>Change Password</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleCopyCode} className="cursor-pointer rounded-xl py-2 font-bold text-slate-200 hover:bg-[#172338] hover:text-white">
                                            {copied ? (
                                                <Check className="mr-2 h-4 w-4 text-emerald-400" />
                                            ) : (
                                                <Copy className="mr-2 h-4 w-4 text-slate-400" />
                                            )}
                                            <div className="flex w-full items-center justify-between">
                                                <span>Copy Link Code</span>
                                                <span className="select-all rounded border border-[#26344d] bg-[#0d162a] px-1.5 py-0.5 font-mono text-[10px] font-black text-[#58c4e8]">{uniqueId}</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1.5 bg-[#202b43]" />
                                        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer rounded-xl py-2 font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Sign Out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 pb-24 md:pb-8">
                        <div className="parent-page-shell">{children}</div>
                    </main>

                    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#26344d] bg-[#071023]/95 px-2 py-3 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.4)] md:hidden">
                        <div className="mx-auto flex max-w-md items-center justify-around">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.url);
                                return (
                                    <button
                                        key={item.title}
                                        onClick={() => {
                                            if (item.url.includes("#") && currentPath === item.url.split("#")[0]) {
                                                const el = document.getElementById(item.url.split("#")[1]);
                                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                                            } else {
                                                navigate(item.url);
                                            }
                                        }}
                                        className={`relative flex flex-col items-center gap-1 rounded-2xl px-4 py-1 transition-all duration-300 ${active ? 'scale-110 text-[#3bc2f3]' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        <Icon className={`h-6 w-6 ${active ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-tight ${active ? 'opacity-100' : 'opacity-60'}`}>
                                            {item.title}
                                        </span>
                                        {active && <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#3bc2f3] shadow-[0_0_10px_#3bc2f3]" />}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => signOut()}
                                className="flex flex-col items-center gap-1 text-slate-400 hover:text-red-400"
                            >
                                <LogOut className="h-6 w-6 stroke-[2px]" />
                                <span className="text-[10px] font-bold uppercase tracking-tight opacity-60">Exit</span>
                            </button>
                        </div>
                    </nav>
                </div>
            </div>
        </SidebarProvider>
    );
}
