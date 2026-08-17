import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Button } from "./Button";
import { IconButton } from "./ui/IconButton";

export type ToastVariant = "info" | "success" | "warning" | "error";
export type ToastAction = { label: string; onClick: () => void | Promise<void> };

const variants = {
  info: { Icon: Info, label: "Informação", className: "border-info/30 text-info" },
  success: { Icon: CheckCircle2, label: "Sucesso", className: "border-success/30 text-success" },
  warning: { Icon: TriangleAlert, label: "Atenção", className: "border-warning/30 text-warning" },
  error: { Icon: AlertCircle, label: "Erro", className: "border-danger/30 text-danger" },
};

export function Toast({ action, children, className, description, onClose, title, variant = "info" }: { action?: ToastAction; children?: ReactNode; className?: string; description?: string; onClose?: () => void; title?: string; variant?: ToastVariant }) {
  const { Icon, label, className: variantClassName } = variants[variant];
  const content = description ?? children;
  return <div className={cn("flex w-full items-start gap-3 rounded-surface border bg-surface px-4 py-3 text-sm shadow-overlay", variantClassName, className)} role={variant === "error" ? "alert" : "status"}>
    <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
    <div className="min-w-0 flex-1 text-foreground"><p className="font-semibold">{title ?? label}</p>{content ? <div className="mt-0.5 text-sm text-muted-foreground">{content}</div> : null}{action ? <Button className="mt-2 min-h-8 px-2 py-1" onClick={() => void action.onClick()} variant="ghost">{action.label}</Button> : null}</div>
    {onClose ? <IconButton aria-label="Fechar notificação" className="-mr-2 -mt-1 h-9 w-9 min-h-9" onClick={onClose}><X aria-hidden="true" className="h-4 w-4" /></IconButton> : null}
  </div>;
}
