import { Timestamp, collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { collections } from "../firebase/collections";
import { firestore } from "../firebase/config";
import type { CardInstallment, CardInvoice } from "../types/creditCard";
import type { RecurringTransaction } from "../types/recurringTransaction";
import type { Transaction } from "../types/transaction";
import { advanceRecurringDate, toSaoPauloDateKey } from "./recurringTransactionsService";
import { createConverter } from "./firestoreConverters";

export type CalendarEventKind = "TRANSACTION" | "INVOICE" | "INSTALLMENT" | "RECURRENCE";
export type CalendarEvent = {
  id: string;
  date: Date;
  dateKey: string;
  kind: CalendarEventKind;
  title: string;
  amountInCents: number;
  direction: "INCOME" | "EXPENSE";
  status?: string;
};

const transactionConverter = createConverter<Transaction>();
const invoiceConverter = createConverter<CardInvoice>();
const installmentConverter = createConverter<CardInstallment>();
const recurrenceConverter = createConverter<RecurringTransaction>();

export async function listCalendarEvents(userId: string, startDate: Date, endDate: Date) {
  if (endDate < startDate) throw new Error("Intervalo de calendario invalido.");
  const range = [where("userId", "==", userId)];
  const [transactionsSnapshot, invoicesSnapshot, installmentsSnapshot, recurrencesSnapshot] = await Promise.all([
    getDocs(query(collection(firestore, collections.transactions).withConverter(transactionConverter), ...range, where("date", ">=", Timestamp.fromDate(startDate)), where("date", "<=", Timestamp.fromDate(endDate)), orderBy("date", "asc"), limit(500))),
    getDocs(query(collection(firestore, collections.cardInvoices).withConverter(invoiceConverter), ...range, where("dueDate", ">=", Timestamp.fromDate(startDate)), where("dueDate", "<=", Timestamp.fromDate(endDate)), orderBy("dueDate", "asc"), limit(200))),
    getDocs(query(collection(firestore, collections.cardInstallments).withConverter(installmentConverter), ...range, where("dueDate", ">=", Timestamp.fromDate(startDate)), where("dueDate", "<=", Timestamp.fromDate(endDate)), orderBy("dueDate", "asc"), limit(500))),
    getDocs(query(collection(firestore, collections.recurringTransactions).withConverter(recurrenceConverter), ...range, where("nextOccurrenceDate", "<=", Timestamp.fromDate(endDate)), orderBy("nextOccurrenceDate", "asc"), limit(200))),
  ]);
  return buildCalendarEvents(
    transactionsSnapshot.docs.map((item) => item.data()), invoicesSnapshot.docs.map((item) => item.data()),
    installmentsSnapshot.docs.map((item) => item.data()), recurrencesSnapshot.docs.map((item) => item.data()), startDate, endDate,
  );
}

export function buildCalendarEvents(transactions: Transaction[], invoices: CardInvoice[], installments: CardInstallment[], recurrences: RecurringTransaction[], startDate: Date, endDate: Date) {
  const events: CalendarEvent[] = transactions.filter((item) => item.type !== "TRANSFER").map((item) => ({
    id: `transaction_${item.id}`, date: item.date, dateKey: toSaoPauloDateKey(item.date), kind: "TRANSACTION",
    title: item.description || (item.type === "INCOME" ? "Receita" : "Despesa"), amountInCents: item.amountInCents,
    direction: item.type === "INCOME" ? "INCOME" : "EXPENSE", status: "REALIZED",
  }));
  events.push(...invoices.map((item) => ({ id: `invoice_${item.id}`, date: item.dueDate, dateKey: toSaoPauloDateKey(item.dueDate), kind: "INVOICE" as const, title: "Vencimento da fatura", amountInCents: Math.max(0, item.totalInCents - item.paidInCents), direction: "EXPENSE" as const, status: item.status })));
  events.push(...installments.map((item) => ({ id: `installment_${item.id}`, date: item.dueDate, dateKey: toSaoPauloDateKey(item.dueDate), kind: "INSTALLMENT" as const, title: `${item.description} (${item.installmentNumber}/${item.installmentsCount})`, amountInCents: item.amountInCents, direction: "EXPENSE" as const, status: item.status })));

  const realized = new Set(transactions.filter((item) => item.recurringTransactionId).map((item) => `${item.recurringTransactionId}_${toSaoPauloDateKey(item.date)}`));
  for (const recurrence of recurrences) {
    for (const date of resolveRecurringOccurrencesInRange(recurrence, startDate, endDate)) {
      const key = `${recurrence.id}_${toSaoPauloDateKey(date)}`;
      if (realized.has(key)) continue;
      events.push({ id: `recurrence_${key}`, date, dateKey: toSaoPauloDateKey(date), kind: "RECURRENCE", title: recurrence.description, amountInCents: recurrence.amountInCents, direction: recurrence.type, status: "EXPECTED" });
    }
  }
  return events.sort((left, right) => left.date.getTime() - right.date.getTime() || left.id.localeCompare(right.id));
}

export function resolveRecurringOccurrencesInRange(recurrence: RecurringTransaction, startDate: Date, endDate: Date, maxOccurrences = 400) {
  if (recurrence.status !== "ACTIVE") return [];
  const dates: Date[] = [];
  let next = recurrence.nextOccurrenceDate;
  let inspected = 0;
  while (next < startDate && inspected < maxOccurrences) {
    next = advanceRecurringDate(next, recurrence.frequency, recurrence.startDate.getDate());
    inspected += 1;
  }
  while (next <= endDate && dates.length < maxOccurrences) {
    if (!recurrence.endDate || next <= recurrence.endDate) dates.push(next);
    next = advanceRecurringDate(next, recurrence.frequency, recurrence.startDate.getDate());
  }
  return dates;
}

export function groupCalendarEventsByDate(events: CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEvent[]>>((groups, event) => {
    (groups[event.dateKey] ??= []).push(event);
    return groups;
  }, {});
}

export function saoPauloMonthRange(year: number, monthIndex: number) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const next = monthIndex === 11 ? `${year + 1}-01` : `${year}-${String(monthIndex + 2).padStart(2, "0")}`;
  return { startDate: new Date(`${year}-${month}-01T00:00:00-03:00`), endDate: new Date(new Date(`${next}-01T00:00:00-03:00`).getTime() - 1) };
}
