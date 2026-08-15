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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
      <section
        aria-describedby={description ? "modal-description" : undefined}
        aria-modal="true"
        aria-labelledby="modal-title"
        className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#111820] sm:rounded-lg sm:p-6"
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
          <Button aria-label="Fechar" className="h-10 w-10 px-0" onClick={onClose} title="Fechar" variant="ghost">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-5">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </section>
    </div>
  );
}
