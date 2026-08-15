import type { CardInstallment, CardInvoice, CreditCard, InvoiceStatus } from "../types/creditCard";

export function splitPurchaseIntoInstallments(amountInCents: number, installmentsCount: number) {
  const baseAmount = Math.floor(amountInCents / installmentsCount);
  const remainder = amountInCents % installmentsCount;
  return Array.from({ length: installmentsCount }, (_, index) => baseAmount + (index === 0 ? remainder : 0));
}

export function buildInvoiceDates(cycleDate: Date, closingDay: number, dueDay: number) {
  const year = cycleDate.getFullYear();
  const month = cycleDate.getMonth();
  const closingDate = new Date(year, month, clampDay(year, month, closingDay), 23, 59, 59, 999);
  const dueMonth = dueDay <= closingDay ? month + 1 : month;
  const dueDate = new Date(year, dueMonth, clampDay(year, dueMonth, dueDay), 23, 59, 59, 999);
  return {
    cycleKey: `${closingDate.getFullYear()}-${String(closingDate.getMonth() + 1).padStart(2, "0")}`,
    closingDate,
    dueDate,
  };
}

export function resolveInvoiceCycleDate(purchaseDate: Date, closingDay: number) {
  const base = new Date(purchaseDate);
  if (purchaseDate.getDate() > closingDay) {
    base.setMonth(base.getMonth() + 1);
  }
  return base;
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function computeInvoiceStatus(dueDate: Date): InvoiceStatus {
  return dueDate < new Date() ? "OVERDUE" : "OPEN";
}

export function normalizeInvoice(invoice: CardInvoice) {
  if (invoice.status === "PAID") return invoice;
  if (invoice.dueDate < new Date()) return { ...invoice, status: "OVERDUE" as const };
  if (invoice.closingDate < new Date()) return { ...invoice, status: "CLOSED" as const };
  return invoice;
}

export function sumInstallmentsByInvoice(installments: CardInstallment[]) {
  const totals = new Map<string, number>();
  installments.forEach((installment) => totals.set(installment.invoiceId, (totals.get(installment.invoiceId) ?? 0) + installment.amountInCents));
  return totals;
}

export function buildCardInvoiceId(card: CreditCard, occurrenceDate: Date) {
  const invoice = buildInvoiceDates(resolveInvoiceCycleDate(occurrenceDate, card.closingDay), card.closingDay, card.dueDay);
  return `${card.id}_${invoice.cycleKey}`;
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, new Date(year, month + 1, 0).getDate());
}
