import { cn } from "../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 text-white shadow-sm shadow-emerald-700/15 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-300 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400 dark:disabled:bg-emerald-900",
  secondary:
    "border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  ghost:
    "text-slate-600 hover:bg-slate-100 hover:text-slate-950 active:bg-slate-200 disabled:text-slate-400 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300 dark:disabled:bg-rose-950",
};

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-10";

export function buttonClassName(variant: ButtonVariant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}
