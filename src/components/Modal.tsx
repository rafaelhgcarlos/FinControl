import { useEffect, useId, useRef, type KeyboardEvent, type PropsWithChildren, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./ui/IconButton";

type ModalProps = PropsWithChildren<{
  isOpen: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  initialFocus?: string;
  closeDisabled?: boolean;
  onClose: () => void;
}>;

export function Modal({ children, closeDisabled = false, description, footer, initialFocus, isOpen, onClose, title }: ModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      const firstFocusable = (initialFocus ? dialog.querySelector<HTMLElement>(initialFocus) : null) ?? dialog.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      (firstFocusable ?? dialog).focus();
    }
    return () => previouslyFocused?.focus();
  }, [initialFocus, isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!closeDisabled) onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"));
    if (focusable.length === 0) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-surface border border-border bg-surface p-5 shadow-overlay sm:rounded-surface sm:p-6"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <IconButton aria-label="Fechar" disabled={closeDisabled} onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
        <div className="mt-5">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </section>
    </div>
  );
}
