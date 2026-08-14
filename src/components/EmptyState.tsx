import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
};

export function EmptyState({ description, icon, title }: EmptyStateProps) {
  return (
    <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      {icon ?? <Inbox className="h-8 w-8 text-slate-400" aria-hidden="true" />}
      <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">{description}</p> : null}
    </div>
  );
}
