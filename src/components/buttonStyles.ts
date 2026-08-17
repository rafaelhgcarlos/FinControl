import { cn } from "../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 disabled:bg-primary/45",
  secondary:
    "border border-border bg-surface text-foreground shadow-sm hover:bg-surface-subtle active:bg-border/50 disabled:text-muted-foreground",
  ghost:
    "text-muted-foreground hover:bg-surface-subtle hover:text-foreground active:bg-border/50 disabled:text-muted-foreground/60",
  danger:
    "bg-danger text-white shadow-sm hover:bg-danger/90 active:bg-danger/80 disabled:bg-danger/40",
};

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-10";

export function buttonClassName(variant: ButtonVariant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}
