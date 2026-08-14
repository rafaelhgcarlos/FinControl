import type { PropsWithChildren, ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

type ModalProps = PropsWithChildren<{
  isOpen: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
}>;

export function Modal({ children, description, footer, isOpen, onClose, title }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" role="presentation">
      <section
        aria-describedby={description ? "modal-description" : undefined}
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white" id="modal-title">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400" id="modal-description">
                {description}
              </p>
            ) : null}
          </div>
          <Button aria-label="Fechar" onClick={onClose} variant="ghost">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-5">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </section>
    </div>
  );
}
