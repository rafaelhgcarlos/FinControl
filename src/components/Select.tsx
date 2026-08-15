import type { SelectHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm transition hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-[#0d131a] dark:text-white dark:hover:border-slate-600 dark:disabled:bg-slate-800",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
