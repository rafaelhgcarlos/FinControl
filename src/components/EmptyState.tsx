import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";

type EmptyStateProps = {
  action?: ReactNode;
  className?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  size?: "default" | "compact";
};

export function EmptyState({ action, className, description, icon, size = "default", title }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 text-center dark:border-slate-700", size === "compact" ? "min-h-36 py-6" : "mt-6 min-h-64 py-10", className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden="true" />}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
