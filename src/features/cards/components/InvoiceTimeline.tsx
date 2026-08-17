import { AlertTriangle, Check, Circle } from "lucide-react";
import type { CardInvoice } from "../../../types/creditCard";
import { formatDatePtBr } from "../../../utils/date";

export function InvoiceTimeline({ invoice }: { invoice: CardInvoice }) {
  const overdue = invoice.status === "OVERDUE";
  const paid = invoice.status === "PAID";
  const reachedClosed = invoice.status !== "OPEN";
  const steps = [
    { active: true, detail: "Ciclo iniciado", label: "Aberta" },
    { active: reachedClosed, detail: formatDatePtBr(invoice.closingDate), label: "Fechada" },
    { active: overdue || paid, danger: overdue, detail: formatDatePtBr(invoice.dueDate), label: overdue ? "Vencida" : "Vencimento" },
    { active: paid, detail: paid ? "Pagamento concluído" : "Aguardando pagamento", label: "Paga" },
  ];
  return <ol aria-label="Ciclo da fatura" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{steps.map((step, index) => <li className="relative" key={step.label}><div className={`flex items-center gap-2 text-xs font-semibold ${step.danger ? "text-danger" : step.active ? "text-foreground" : "text-muted-foreground"}`}>{step.danger ? <AlertTriangle aria-hidden="true" className="h-4 w-4" /> : step.active ? <Check aria-hidden="true" className="h-4 w-4" /> : <Circle aria-hidden="true" className="h-4 w-4" />}{step.label}</div><p className="ml-6 mt-0.5 text-[11px] text-muted-foreground">{step.detail}</p>{index < steps.length - 1 ? <span aria-hidden="true" className="absolute left-2 top-5 hidden h-px w-[calc(100%-0.5rem)] bg-border sm:block" /> : null}</li>)}</ol>;
}
