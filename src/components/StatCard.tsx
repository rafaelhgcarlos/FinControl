import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

type StatCardProps = {
  detail?: string;
  label: string;
  value: string;
  icon: LucideIcon;
};

export function StatCard({ detail, icon: Icon, label, value }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{value}</p>
          {detail ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p> : null}
        </div>
        <span className="rounded-md bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}
