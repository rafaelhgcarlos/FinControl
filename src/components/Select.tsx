import type { SelectHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { controlClassName } from "./ui/styles";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        controlClassName,
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
