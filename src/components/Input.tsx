import type { InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { controlClassName } from "./ui/styles";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        controlClassName,
        className,
      )}
      {...props}
    />
  );
}
