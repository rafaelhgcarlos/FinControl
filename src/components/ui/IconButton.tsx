import type { ReactNode } from "react";
import { Button, type ButtonProps } from "../Button";
import { cn } from "../../utils/cn";

type IconButtonProps = Omit<ButtonProps, "aria-label" | "children"> & { "aria-label": string; children: ReactNode };

export function IconButton({ "aria-label": label, children, className, title = label, variant = "ghost", ...props }: IconButtonProps) {
  return <Button aria-label={label} className={cn("h-11 w-11 shrink-0 px-0 [&>svg]:h-5 [&>svg]:w-5 sm:h-10 sm:w-10", className)} title={title} variant={variant} {...props}>{children}</Button>;
}
