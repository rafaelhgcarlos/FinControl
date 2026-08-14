import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function ChartContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-h-64 rounded-lg border border-slate-200 p-4 dark:border-slate-800", className)}
      {...props}
    />
  );
}
