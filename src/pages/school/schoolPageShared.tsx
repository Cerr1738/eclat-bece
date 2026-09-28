import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
}) {
  const toneStyles: Record<string, string> = {
    primary: "bg-[#1e3857] text-[#66d7ff]",
    success: "bg-[#102f2b] text-[#48d7b7]",
    accent: "bg-[#2b2145] text-[#c4a9ff]",
    warning: "bg-[#352813] text-[#ffca6a]",
  };

  return (
    <Card className="border border-[#2a3852] bg-[#151e33] text-slate-100 shadow-none min-w-0">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 truncate">
              {label}
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
              {value}
            </p>
            <p className="mt-1 text-[11px] text-[#58c4e8] truncate">{hint}</p>
          </div>
          <div className={`rounded-xl p-2.5 sm:p-3 flex-shrink-0 ${toneStyles[tone] || toneStyles.primary}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#71c9ed] truncate">{title}</h2>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-400">{subtitle}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
