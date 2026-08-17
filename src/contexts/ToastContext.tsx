import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { Toast, type ToastAction, type ToastVariant } from "../components/Toast";

type ToastOptions = { action?: ToastAction; duration?: number; title?: string };
type ToastRecord = ToastOptions & { id: string; description: string; variant: ToastVariant };
type ToastApi = Record<ToastVariant, (description: string, options?: ToastOptions) => string> & { dismiss: (id: string) => void };
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const dismiss = useCallback((id: string) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const notify = useCallback((variant: ToastVariant, description: string, options: ToastOptions = {}) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current.slice(-3), { id, description, variant, ...options }]);
    const duration = options.duration ?? (variant === "error" ? 7000 : 4500);
    if (duration > 0) window.setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);
  const api = useMemo<ToastApi>(() => ({ dismiss, error: (message, options) => notify("error", message, options), info: (message, options) => notify("info", message, options), success: (message, options) => notify("success", message, options), warning: (message, options) => notify("warning", message, options) }), [dismiss, notify]);

  return <ToastContext.Provider value={api}>{children}<div aria-label="Notificações" className="pointer-events-none fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(24rem,calc(100vw-2rem))]">{toasts.map((toast) => <div className="pointer-events-auto w-full" key={toast.id}><Toast action={toast.action ? { ...toast.action, onClick: async () => { await toast.action?.onClick(); dismiss(toast.id); } } : undefined} description={toast.description} onClose={() => dismiss(toast.id)} title={toast.title} variant={toast.variant} /></div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast deve ser usado dentro de ToastProvider.");
  return value;
}
