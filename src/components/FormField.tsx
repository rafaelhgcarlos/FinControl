import type { PropsWithChildren } from "react";

type FormFieldProps = PropsWithChildren<{
  id: string;
  label: string;
  error?: string;
  hint?: string;
}>;

export function FormField({ children, error, hint, id, label }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-800 dark:text-slate-200" htmlFor={id}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-300" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
