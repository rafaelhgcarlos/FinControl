import type { ReactNode } from "react";
import { Button, type ButtonProps } from "../Button";

type IconButtonProps = Omit<ButtonProps, "aria-label" | "children"> & { "aria-label": string; children: ReactNode };

export function IconButton({ "aria-label": label, children, title = label, variant = "ghost", ...props }: IconButtonProps) {
  return <Button aria-label={label} className="h-11 w-11 shrink-0 px-0 sm:h-10 sm:w-10" title={title} variant={variant} {...props}>{children}</Button>;
}
