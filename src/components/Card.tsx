import type { ElementType, HTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { surfaceClassName } from "./ui/styles";

type CardProps = HTMLAttributes<HTMLElement> & { as?: ElementType; variant?: "default" | "subtle" | "interactive" };

const variants = {
  default: "",
  subtle: "bg-surface-subtle shadow-none",
  interactive: "transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
};

export function Card({ as: Component = "div", className, variant = "default", ...props }: CardProps) {
  return (
    <Component
      className={cn(
        surfaceClassName,
        "p-4 sm:p-5",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
