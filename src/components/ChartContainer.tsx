import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { surfaceClassName } from "./ui/styles";

export function ChartContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(surfaceClassName, "min-h-64 p-4 sm:p-5", className)}
      {...props}
    />
  );
}
