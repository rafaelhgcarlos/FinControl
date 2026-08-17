import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../utils/cn";
import { Button, type ButtonProps } from "./Button";

type EmptyStateAction = { disabled?: boolean; label: string; onClick?: () => void; to?: string; variant?: ButtonProps["variant"] };

type EmptyStateProps = {
  action?: ReactNode | EmptyStateAction;
  className?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  size?: "default" | "compact";
};

export function EmptyState({ action, className, description, icon, size = "default", title }: EmptyStateProps) {
  const renderedAction = action && typeof action === "object" && "label" in action
    ? action.to ? <Button asChild variant={action.variant}><Link to={action.to}>{action.label}</Link></Button> : <Button disabled={action.disabled} onClick={action.onClick} variant={action.variant}>{action.label}</Button>
    : action;
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-surface border border-dashed border-border px-6 text-center", size === "compact" ? "min-h-36 py-6" : "mt-6 min-h-64 py-10", className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden="true" />}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">{description}</p> : null}
      {renderedAction ? <div className="mt-4">{renderedAction}</div> : null}
    </div>
  );
}
