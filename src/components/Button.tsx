import { LoaderCircle } from "lucide-react";
import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactElement } from "react";
import { buttonClassName, type ButtonVariant } from "./buttonStyles";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
};

export function Button({ asChild = false, children, className, disabled, loading = false, variant = "primary", type = "button", ...buttonProps }: ButtonProps) {
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: buttonClassName(variant, [child.props.className, className].filter(Boolean).join(" ")),
    });
  }

  return <button aria-busy={loading || undefined} className={buttonClassName(variant, className)} disabled={disabled || loading} type={type} {...buttonProps}>{loading ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}{children}</button>;
}
