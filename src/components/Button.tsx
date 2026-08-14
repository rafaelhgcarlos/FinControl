import type { ButtonHTMLAttributes } from "react";
import { buttonClassName, type ButtonVariant } from "./buttonStyles";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, variant = "primary", type = "button", ...buttonProps }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} type={type} {...buttonProps} />;
}
