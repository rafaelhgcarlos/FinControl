import { X } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent, type PropsWithChildren, type ReactNode } from "react";
import { IconButton } from "./IconButton";

export function BottomSheet({ children, closeDisabled = false, description, dragIndicator = true, footer, isOpen, onClose, title }: PropsWithChildren<{ closeDisabled?: boolean; description?: string; dragIndicator?: boolean; footer?: ReactNode; isOpen: boolean; onClose: () => void; title: string }>) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = dialogRef.current?.querySelector<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])");
    (first ?? dialogRef.current)?.focus();
    return () => previous?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!closeDisabled) onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) { event.preventDefault(); event.currentTarget.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (!closeDisabled && event.target === event.currentTarget) onClose();
  }

  return <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/55 backdrop-blur-sm" onMouseDown={handleBackdrop} role="presentation">
    <section aria-describedby={description ? descriptionId : undefined} aria-labelledby={titleId} aria-modal="true" className="flex max-h-[min(85vh,48rem)] w-full animate-[bottom-sheet-in_180ms_ease-out] flex-col overflow-hidden rounded-t-surface border border-b-0 border-border bg-surface shadow-overlay pb-[env(safe-area-inset-bottom)] motion-reduce:animate-none" onKeyDown={handleKeyDown} ref={dialogRef} role="dialog" tabIndex={-1}>
      {dragIndicator ? <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" /> : null}
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div><h2 className="font-semibold text-foreground" id={titleId}>{title}</h2>{description ? <p className="mt-1 text-sm text-muted-foreground" id={descriptionId}>{description}</p> : null}</div>
        <IconButton aria-label="Fechar" disabled={closeDisabled} onClick={onClose}><X aria-hidden="true" className="h-4 w-4" /></IconButton>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      {footer ? <footer className="sticky bottom-0 border-t border-border bg-surface px-5 py-3">{footer}</footer> : null}
    </section>
  </div>;
}
