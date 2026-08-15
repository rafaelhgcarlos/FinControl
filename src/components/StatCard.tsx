import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

type StatCardProps = {
  detail?: string;
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "emerald" | "rose" | "sky" | "amber";
};

const tones = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

export function StatCard({ detail, icon: Icon, label, tone = "emerald", value }: StatCardProps) {
  return (
    <Card className="relative min-h-36 overflow-hidden">
      <div className="flex h-full items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 break-words text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
          {detail ? <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p> : null}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}
