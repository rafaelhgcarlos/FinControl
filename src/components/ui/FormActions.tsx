import type { FormStatus } from "../../hooks/useFormState";
import { Button } from "../Button";

const statusLabels: Partial<Record<FormStatus, string>> = {
  dirty: "Alterações não salvas",
  saved: "Alterações salvas",
  saving: "Salvando alterações…",
};

export function FormActions({ busy = false, busyLabel = "Salvando...", cancelLabel = "Cancelar", onCancel, status = "initial", submitLabel = "Salvar" }: { busy?: boolean; busyLabel?: string; cancelLabel?: string; onCancel: () => void; status?: FormStatus; submitLabel?: string }) {
  return <div className="sticky bottom-0 z-10 -mx-5 mt-2 flex flex-col-reverse gap-2 border-t border-border bg-surface/95 px-5 pb-[calc(0.25rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:px-6">
    {statusLabels[status] ? <p aria-live="polite" className="mr-auto text-xs text-muted-foreground">{statusLabels[status]}</p> : null}
    <Button className="w-full sm:w-auto" disabled={busy} variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
    <Button className="w-full sm:w-auto" loading={busy} type="submit">{busy ? busyLabel : submitLabel}</Button>
  </div>;
}
