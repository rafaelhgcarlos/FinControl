import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function Toast({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
        className,
      )}
      role="status"
      {...props}
    />
  );
}
