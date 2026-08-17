import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { EmptyState } from "../../../components/EmptyState";
import { Input } from "../../../components/Input";
import { Select } from "../../../components/Select";
import type { Category } from "../../../types/category";
import type { CardInstallment, CardInvoice, CardPayment, CardPurchase, CreditCard } from "../../../types/creditCard";
import { formatDatePtBr } from "../../../utils/date";
import { formatCurrencyFromCents } from "../../../utils/money";
import { buildInvoiceItems, getInvoiceStatusLabel, getInvoiceStatusVariant, type InvoiceViewState } from "../cardViewUtils";
import { categoryName } from "./CardActivityLists";
import { InvoiceTimeline } from "./InvoiceTimeline";

export function InvoiceView({ actionsDisabled = false, card, categories, installments, invoice, invoiceView, onEditPurchase, onPayInvoice, onRemoveInvoice, onRemovePurchase, onViewChange, payments, purchases }: {
  actionsDisabled?: boolean;
  card: CreditCard;
  categories: Category[];
  installments: CardInstallment[];
  invoice: CardInvoice;
  invoiceView: InvoiceViewState;
  onEditPurchase: (purchase: CardPurchase) => void;
  onPayInvoice: (invoice: CardInvoice) => void;
  onRemoveInvoice: (invoice: CardInvoice) => void;
  onRemovePurchase: (purchase: CardPurchase) => void;
  onViewChange: (invoiceId: string, patch: Partial<InvoiceViewState>) => void;
  payments: CardPayment[];
  purchases: CardPurchase[];
}) {
  const remaining = invoice.totalInCents - invoice.paidInCents;
  const items = buildInvoiceItems(invoice, installments, purchases, invoiceView.query, invoiceView.sort);
  const visibleItems = items.slice(0, invoiceView.visible);
  const groupedItems = groupItemsByDate(visibleItems);
  const paid = invoice.status === "PAID" || remaining <= 0;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70" aria-label="Resumo da fatura">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">Fatura {invoice.cycleKey}</h2><Badge variant={getInvoiceStatusVariant(invoice.status)}>{getInvoiceStatusLabel(invoice.status)}</Badge></div>
            <p className="mt-1 text-sm text-slate-500">Fecha em {formatDatePtBr(invoice.closingDate)} • vence em {formatDatePtBr(invoice.dueDate)}</p>
            <p className="mt-1 text-xs text-slate-500">{payments.length} pagamento(s) registrado(s)</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button disabled={actionsDisabled || paid} onClick={() => onPayInvoice(invoice)}>{paid ? "Fatura paga" : "Pagar fatura"}</Button>
            <Button disabled={actionsDisabled || invoice.paidInCents > 0 || paid} onClick={() => onRemoveInvoice(invoice)} variant="danger">Excluir fatura</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <InvoiceMetric emphasis label="Restante" value={formatCurrencyFromCents(Math.max(0, remaining))} />
          <InvoiceMetric label="Total" value={formatCurrencyFromCents(invoice.totalInCents)} />
          <InvoiceMetric label="Pago" value={formatCurrencyFromCents(invoice.paidInCents)} />
          <InvoiceMetric label="Limite disponível" value={formatCurrencyFromCents(card.limitInCents - card.committedLimitInCents)} />
        </div>
        <div className="mt-4 border-t border-border pt-4"><InvoiceTimeline invoice={invoice} /></div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
        <Input aria-label="Buscar item da fatura" placeholder="Buscar por descrição" value={invoiceView.query} onChange={(event) => onViewChange(invoice.id, { query: event.target.value, visible: 12 })} />
        <Select aria-label="Ordenar itens" value={invoiceView.sort} onChange={(event) => onViewChange(invoice.id, { sort: event.target.value as InvoiceViewState["sort"] })}>
          <option value="date-desc">Mais recentes</option>
          <option value="date-asc">Mais antigas</option>
          <option value="amount-desc">Maior valor</option>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          action={invoiceView.query ? <Button onClick={() => onViewChange(invoice.id, { query: "", visible: 12 })} variant="secondary">Limpar busca</Button> : undefined}
          className="mt-0"
          description={invoiceView.query ? "Nenhum item corresponde à busca atual." : "Os itens desta fatura aparecerão aqui."}
          size="compact"
          title={invoiceView.query ? "Nenhum resultado" : "Nenhum item na fatura"}
        />
      ) : (
        <div className="space-y-5">
          {groupedItems.map(([date, group]) => (
            <section aria-label={`Compras de ${date}`} key={date}>
              <div className="mb-2 flex items-center gap-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{date}</h3><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>
              <div className="space-y-2">{group.map(({ installment, purchase }) => (
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between" key={installment.id}>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{installment.description}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{categoryName(categories, installment.categoryId ?? purchase?.categoryId)}</span>{installment.installmentsCount > 1 ? <Badge>{installment.installmentNumber}/{installment.installmentsCount}</Badge> : null}</div></div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end"><span className="shrink-0 font-semibold">{formatCurrencyFromCents(installment.amountInCents)}</span>{purchase ? <Button aria-label={`Editar ${installment.description}`} className="min-h-9 px-2" disabled={actionsDisabled || invoice.paidInCents > 0 || paid} onClick={() => onEditPurchase(purchase)} variant="ghost"><Pencil className="h-4 w-4" /></Button> : null}{purchase ? <Button aria-label={`Excluir ${installment.description}`} className="min-h-9 px-2" disabled={actionsDisabled || invoice.paidInCents > 0 || paid} onClick={() => onRemovePurchase(purchase)} variant="ghost"><Trash2 className="h-4 w-4" /></Button> : null}</div>
                </div>
              ))}</div>
            </section>
          ))}
          {items.length > visibleItems.length ? <Button className="w-full" onClick={() => onViewChange(invoice.id, { visible: invoiceView.visible + 20 })} variant="secondary">Mostrar mais</Button> : null}
        </div>
      )}
    </div>
  );
}

function InvoiceMetric({ emphasis = false, label, value }: { emphasis?: boolean; label: string; value: string }) {
  return <div className={`rounded-surface px-3 py-3 ${emphasis ? "bg-primary text-primary-foreground shadow-sm" : "bg-surface"}`}><p className={`text-xs ${emphasis ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{label}</p><p className={`mt-1 font-semibold ${emphasis ? "text-2xl" : "text-lg"}`}>{value}</p></div>;
}

function groupItemsByDate(items: ReturnType<typeof buildInvoiceItems>) {
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const label = formatDatePtBr(item.purchase?.purchaseDate ?? item.installment.dueDate);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  return Array.from(groups.entries());
}
