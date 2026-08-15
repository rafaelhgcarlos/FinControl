import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
};

export function PageHeader({ action, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-slate-200/70 pb-5 dark:border-slate-800/80 sm:mb-7 sm:pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {action ? <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto">{action}</div> : null}
    </header>
  );
}
