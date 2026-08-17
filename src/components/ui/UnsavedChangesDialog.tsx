import { FileWarning } from "lucide-react";
import { Button } from "../Button";
import { Modal } from "../Modal";

export function UnsavedChangesDialog({ isOpen, onDiscard, onKeepEditing }: { isOpen: boolean; onDiscard: () => void; onKeepEditing: () => void }) {
  return <Modal description="As alterações feitas neste formulário ainda não foram salvas." initialFocus="#keep-editing" isOpen={isOpen} onClose={onKeepEditing} title="Descartar alterações?">
    <div className="mb-5 flex items-start gap-3 rounded-control bg-warning/10 p-3 text-sm text-foreground"><FileWarning aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-warning" /><span>Se você sair agora, os dados preenchidos serão perdidos.</span></div>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button id="keep-editing" onClick={onKeepEditing} variant="secondary">Continuar editando</Button><Button onClick={onDiscard} variant="danger">Descartar alterações</Button></div>
  </Modal>;
}
