import { cn } from "../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-300 dark:disabled:bg-emerald-900",
  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 active:bg-slate-200 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  ghost:
    "text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:text-slate-400 dark:text-slate-200 dark:hover:bg-slate-800",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300 dark:disabled:bg-rose-950",
};

const base =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70";

export function buttonClassName(variant: ButtonVariant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}
