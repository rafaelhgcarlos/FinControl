import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

type BadgeVariant = "success" | "warning" | "danger" | "neutral";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300",
  neutral: "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
