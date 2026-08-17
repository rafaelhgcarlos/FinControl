import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { collections } from "../firebase/collections";
import { firestore } from "../firebase/config";
import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { CreditCard } from "../types/creditCard";
import type { RecurringFrequency, RecurringStatus, RecurringTargetType, RecurringTransaction, RecurringTransactionType } from "../types/recurringTransaction";
import { createCardPurchase } from "../features/cards";
import { createConverter } from "./firestoreConverters";
import { applyMonthlySummaryDelta } from "./monthlySummariesService";
import { balanceDeltas, type TransactionInput } from "./transactionsService";

const recurringConverter = createConverter<RecurringTransaction>();

export type RecurringTransactionInput = {
  amountInCents: number;
  type: RecurringTransactionType;
  targetType: RecurringTargetType;
  frequency: RecurringFrequency;
  status: RecurringStatus;
  categoryId: string;
  accountId?: string;
  cardId?: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  nextOccurrenceDate?: Date;
};

export type ProcessRecurringOptions = {
  today?: Date;
  maxOccurrences?: number;
};

export async function listRecurringTransactions(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(firestore, collections.recurringTransactions).withConverter(recurringConverter),
      where("userId", "==", userId),
      orderBy("nextOccurrenceDate", "asc"),
      limit(200),
    ),
  );
  return snapshot.docs.map((item) => item.data()).sort((left, right) => left.nextOccurrenceDate.getTime() - right.nextOccurrenceDate.getTime());
}

export async function createRecurringTransaction(userId: string, input: RecurringTransactionInput) {
  validateRecurringInput(input);
  const now = Timestamp.now();
  await setDoc(doc(collection(firestore, collections.recurringTransactions)), {
    userId,
    amountInCents: input.amountInCents,
    type: input.type,
    targetType: input.targetType,
    frequency: input.frequency,
    status: input.status,
    categoryId: input.categoryId,
    accountId: input.targetType === "ACCOUNT" ? input.accountId : null,
    cardId: input.targetType === "CARD" ? input.cardId : null,
    description: input.description.trim(),
    startDate: Timestamp.fromDate(input.startDate),
    endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
    nextOccurrenceDate: Timestamp.fromDate(input.nextOccurrenceDate ?? input.startDate),
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateRecurringTransaction(recurringId: string, input: RecurringTransactionInput) {
  validateRecurringInput(input);
  await updateDoc(doc(firestore, collections.recurringTransactions, recurringId), {
    amountInCents: input.amountInCents,
    type: input.type,
    targetType: input.targetType,
    frequency: input.frequency,
    status: input.status,
    categoryId: input.categoryId,
    accountId: input.targetType === "ACCOUNT" ? input.accountId : null,
    cardId: input.targetType === "CARD" ? input.cardId : null,
    description: input.description.trim(),
    startDate: Timestamp.fromDate(input.startDate),
    endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
    nextOccurrenceDate: Timestamp.fromDate(input.nextOccurrenceDate ?? input.startDate),
    updatedAt: Timestamp.now(),
  });
}

export async function updateRecurringStatus(recurringId: string, status: RecurringStatus) {
  await updateDoc(doc(firestore, collections.recurringTransactions, recurringId), {
    status,
    updatedAt: Timestamp.now(),
  });
}

export async function processDueRecurringTransactions(
  userId: string,
  recurrences: RecurringTransaction[],
  accounts: Account[],
  categories: Category[],
  cards: CreditCard[],
  options: ProcessRecurringOptions = {},
) {
  const today = options.today ?? new Date();
  const maxOccurrences = options.maxOccurrences ?? 20;
  let processed = 0;

  for (const recurrence of recurrences) {
    if (processed >= maxOccurrences) break;
    const dueDates = resolveDueOccurrences(recurrence, today, maxOccurrences - processed);
    for (const occurrenceDate of dueDates) {
      if (recurrence.targetType === "CARD") {
        await processCardOccurrence(userId, recurrence, occurrenceDate, cards, categories);
      } else {
        await processAccountOccurrence(userId, recurrence, occurrenceDate);
      }
      processed += 1;
    }
    if (dueDates.length > 0) {
      const anchorDay = recurrence.startDate.getDate();
      const nextOccurrenceDate = dueDates.reduce((next) => advanceRecurringDate(next, recurrence.frequency, anchorDay), recurrence.nextOccurrenceDate);
      await updateDoc(doc(firestore, collections.recurringTransactions, recurrence.id), {
        nextOccurrenceDate: Timestamp.fromDate(nextOccurrenceDate),
        lastProcessedDate: Timestamp.fromDate(dueDates.at(-1) ?? recurrence.nextOccurrenceDate),
        updatedAt: Timestamp.now(),
      });
    }
  }

  return processed;
}

export function resolveDueOccurrences(recurrence: RecurringTransaction, today: Date, maxOccurrences: number) {
  if (recurrence.status !== "ACTIVE") return [];
  const dates: Date[] = [];
  let next = startOfSaoPauloDay(recurrence.nextOccurrenceDate);
  const lastAllowed = recurrence.endDate && recurrence.endDate < today ? recurrence.endDate : today;

  while (dates.length < maxOccurrences && next <= lastAllowed) {
    dates.push(next);
    next = advanceRecurringDate(next, recurrence.frequency, recurrence.startDate.getDate());
  }

  return dates;
}

export function advanceRecurringDate(date: Date, frequency: RecurringFrequency, anchorDay = date.getDate()) {
  const next = new Date(date);
  if (frequency === "WEEKLY") next.setDate(next.getDate() + 7);
  if (frequency === "MONTHLY") {
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    next.setDate(Math.min(anchorDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  }
  if (frequency === "YEARLY") {
    const month = next.getMonth();
    next.setDate(1);
    next.setFullYear(next.getFullYear() + 1);
    next.setMonth(month);
    next.setDate(Math.min(anchorDay, new Date(next.getFullYear(), month + 1, 0).getDate()));
  }
  return next;
}

export function buildRecurringOccurrenceId(recurrenceId: string, occurrenceDate: Date) {
  return `recurring_${recurrenceId}_${toSaoPauloDateKey(occurrenceDate)}`;
}

export function toSaoPauloDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(date);
}

function startOfSaoPauloDay(date: Date) {
  return new Date(`${toSaoPauloDateKey(date)}T12:00:00.000-03:00`);
}

async function processAccountOccurrence(userId: string, recurrence: RecurringTransaction, occurrenceDate: Date) {
  const transactionId = buildRecurringOccurrenceId(recurrence.id, occurrenceDate);
  const transactionRef = doc(firestore, collections.transactions, transactionId);
  const input: TransactionInput = {
    amountInCents: recurrence.amountInCents,
    type: recurrence.type,
    categoryId: recurrence.categoryId,
    accountId: recurrence.accountId ?? "",
    date: occurrenceDate,
    description: recurrence.description,
  };
  const now = Timestamp.now();

  await runTransaction(firestore, async (dbTransaction) => {
    const existing = await dbTransaction.get(transactionRef);
    if (existing.exists()) return;

    const snapshots = await Promise.all(balanceDeltas(input).map(async (delta) => {
      const accountRef = doc(firestore, collections.accounts, delta.accountId);
      return { accountRef, delta, snapshot: await dbTransaction.get(accountRef) };
    }));
    snapshots.forEach(({ accountRef, delta, snapshot }) => {
      if (!snapshot.exists()) throw new Error("Conta nao encontrada.");
      dbTransaction.update(accountRef, {
        currentBalanceInCents: (snapshot.data().currentBalanceInCents as number) + delta.deltaInCents,
        updatedAt: now,
      });
    });
    applyMonthlySummaryDelta(dbTransaction, userId, input);
    dbTransaction.set(transactionRef, {
      userId,
      amountInCents: input.amountInCents,
      type: input.type,
      categoryId: input.categoryId,
      accountId: input.accountId,
      date: Timestamp.fromDate(input.date),
      description: input.description?.trim() || null,
      recurringTransactionId: recurrence.id,
      occurrenceKey: toSaoPauloDateKey(occurrenceDate),
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function processCardOccurrence(userId: string, recurrence: RecurringTransaction, occurrenceDate: Date, cards: CreditCard[], categories: Category[]) {
  try {
    await createCardPurchase(userId, {
      cardId: recurrence.cardId ?? "",
      categoryId: recurrence.categoryId,
      description: recurrence.description,
      amountInCents: recurrence.amountInCents,
      purchaseDate: occurrenceDate,
      installmentsCount: 1,
      firstInstallmentDate: occurrenceDate,
      idempotencyKey: buildRecurringOccurrenceId(recurrence.id, occurrenceDate),
    }, cards, categories);
  } catch (error) {
    if (error instanceof Error && error.message.includes("ja foi registrada")) return;
    throw error;
  }
}

function validateRecurringInput(input: RecurringTransactionInput) {
  if (input.amountInCents <= 0) throw new Error("Informe um valor maior que zero.");
  if (!input.description.trim()) throw new Error("Informe a descricao.");
  if (!input.categoryId) throw new Error("Selecione uma categoria.");
  if (input.targetType === "ACCOUNT" && !input.accountId) throw new Error("Selecione uma conta.");
  if (input.targetType === "CARD" && !input.cardId) throw new Error("Selecione um cartao.");
  if (input.endDate && input.endDate < input.startDate) throw new Error("A data final precisa ser posterior ao inicio.");
}
