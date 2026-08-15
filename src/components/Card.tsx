import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#111820] dark:shadow-none sm:p-5",
        className,
      )}
      {...props}
    />
  );
}
