import type { TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { controlClassName } from "./ui/styles";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        controlClassName,
        "min-h-28",
        className,
      )}
      {...props}
    />
  );
}
