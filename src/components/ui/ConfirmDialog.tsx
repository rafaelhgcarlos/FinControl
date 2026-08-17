import { AlertTriangle } from "lucide-react";
import { Button } from "../Button";
import { Modal } from "../Modal";

export function ConfirmDialog({ busy = false, confirmLabel = "Confirmar", description, isOpen, onClose, onConfirm, title }: { busy?: boolean; confirmLabel?: string; description?: string; isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string }) {
  return <Modal description={description} isOpen={isOpen} onClose={onClose} title={title}><div className="mb-5 flex items-start gap-3 rounded-control bg-danger/10 p-3 text-sm text-danger"><AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><span>Revise os dados antes de continuar. Esta ação pode afetar seu histórico financeiro.</span></div><div className="flex justify-end gap-2"><Button disabled={busy} onClick={onClose} variant="secondary">Cancelar</Button><Button loading={busy} onClick={onConfirm} variant="danger">{busy ? "Processando..." : confirmLabel}</Button></div></Modal>;
}
