import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactElement } from "react";
import { buttonClassName, type ButtonVariant } from "./buttonStyles";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: ButtonVariant;
};

export function Button({ asChild = false, children, className, variant = "primary", type = "button", ...buttonProps }: ButtonProps) {
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: buttonClassName(variant, [child.props.className, className].filter(Boolean).join(" ")),
    });
  }

  return <button className={buttonClassName(variant, className)} type={type} {...buttonProps}>{children}</button>;
}
