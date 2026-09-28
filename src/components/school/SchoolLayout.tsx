import type { ReactNode } from "react";
import { Bell, CalendarDays, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SchoolSidebar } from "@/components/school/SchoolSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "next-themes";

interface SchoolLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  showSearch?: boolean;
}

export function SchoolLayout({ children, title, subtitle, actions, showSearch = true }: SchoolLayoutProps) {
  const { resolvedTheme } = useTheme();
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <SidebarProvider>
      <div data-school-theme={resolvedTheme === "dark" ? "dark" : "light"} className="flex h-screen w-full overflow-hidden bg-[#080f22] text-slate-100 dashboard-theme">
        <SchoolSidebar />

        <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
          {/* Top Bar / Header */}
          <header className="flex h-14 sm:h-16 flex-shrink-0 items-center justify-between border-b border-[#202b43] bg-[#080f22]/95 px-4 backdrop-blur sm:px-6 lg:px-8 z-20">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SidebarTrigger className="text-slate-300 hover:text-white hover:bg-slate-800 md:hidden flex-shrink-0" />

              {showSearch && (
                <div className="hidden items-center gap-2 rounded-full border border-[#26344d] bg-[#0d162a] px-3 py-1.5 text-slate-300 sm:flex w-52 md:w-64">
                  <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <input
                    aria-label="Search"
                    placeholder="Search students, classes..."
                    className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="hidden items-center gap-1.5 rounded-full border border-[#293650] bg-[#111a2e] px-3 py-1 text-[11px] text-slate-200 sm:flex">
                <CalendarDays className="h-3.5 w-3.5 text-[#58c4e8]" />
                <span>{currentDate}</span>
              </div>
              <button
                type="button"
                aria-label="Notifications"
                className="rounded-full p-2 text-slate-300 hover:text-white hover:bg-[#15233c] transition-colors"
              >
                <Bell className="h-4 w-4" />
              </button>
              <ThemeToggle />
            </div>
          </header>

          {/* Main Content Area with safe scrolling and bounded width */}
          <main className="flex-1 min-h-0 min-w-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
              {(title || actions) && (
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    {title && (
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#71c9ed] truncate">
                        {title}
                        <span className="text-[#2ca8d2]">.</span>
                      </h1>
                    )}
                    {subtitle && (
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 line-clamp-2">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  {actions && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
                      {actions}
                    </div>
                  )}
                </div>
              )}

              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
