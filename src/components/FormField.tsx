import { cloneElement, isValidElement, type PropsWithChildren, type ReactElement } from "react";

type FormFieldProps = PropsWithChildren<{
  id: string;
  label: string;
  error?: string;
  hint?: string;
}>;

export function FormField({ children, error, hint, id, label }: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const child = isValidElement(children) ? children as ReactElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }> : null;
  const describedBy = [...new Set([child?.props["aria-describedby"], error ? errorId : undefined, hint ? hintId : undefined].filter(Boolean))].join(" ") || undefined;
  const field = child ? cloneElement(child, {
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : child.props["aria-invalid"],
  }) : children;
  return (
    <div className="min-w-0">
      <label className="block text-sm font-semibold text-foreground" htmlFor={id}>
        {label}
      </label>
      <div className="mt-1.5">{field}</div>
      {hint ? <p className="mt-1.5 text-xs leading-5 text-muted-foreground" id={hintId}>{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
