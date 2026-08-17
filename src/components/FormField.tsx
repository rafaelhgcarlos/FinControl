import type { PropsWithChildren } from "react";

type FormFieldProps = PropsWithChildren<{
  id: string;
  label: string;
  error?: string;
  hint?: string;
}>;

export function FormField({ children, error, hint, id, label }: FormFieldProps) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-semibold text-foreground" htmlFor={id}>
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
