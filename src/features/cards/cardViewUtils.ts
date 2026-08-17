import type { CardInstallment, CardInvoice, CardPurchase, CreditCard } from "../../types/creditCard";

export type InvoiceSort = "date-desc" | "date-asc" | "amount-desc";
export type InvoiceViewState = { query: string; visible: number; sort: InvoiceSort };

export const defaultInvoiceView: InvoiceViewState = { query: "", visible: 12, sort: "date-desc" };

export function getCurrentInvoice(card: CreditCard, invoices: CardInvoice[]) {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return invoices.find((invoice) => invoice.cardId === card.id && invoice.cycleKey === currentKey)
    ?? invoices.filter((invoice) => invoice.cardId === card.id && invoice.status !== "PAID").sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
}

export function buildInvoiceItems(invoice: CardInvoice, installments: CardInstallment[], purchases: CardPurchase[], query: string, sort: InvoiceSort) {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const purchaseById = new Map(purchases.map((purchase) => [purchase.id, purchase]));
  const items = installments
    .filter((installment) => installment.invoiceId === invoice.id)
    .map((installment) => ({ installment, purchase: purchaseById.get(installment.purchaseId) }))
    .filter(({ installment, purchase }) => !normalizedQuery || `${installment.description} ${purchase?.description ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery));

  return items.sort((a, b) => {
    if (sort === "amount-desc") return b.installment.amountInCents - a.installment.amountInCents;
    const aDate = a.purchase?.purchaseDate ?? a.installment.dueDate;
    const bDate = b.purchase?.purchaseDate ?? b.installment.dueDate;
    return sort === "date-asc" ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
  });
}

export function invoiceStatusLabel(status: CardInvoice["status"]) {
  if (status === "PAID") return "Paga";
  if (status === "OVERDUE") return "Vencida";
  if (status === "CLOSED") return "Fechada";
  return "Aberta";
}

export function invoiceStatusVariant(status: CardInvoice["status"]): "success" | "danger" | "warning" | "neutral" {
  if (status === "PAID") return "success";
  if (status === "OVERDUE") return "danger";
  if (status === "CLOSED") return "warning";
  return "neutral";
}
