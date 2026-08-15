import { Timestamp, collection, doc, getDocs, increment, limit, orderBy, query, startAfter, where, writeBatch, type DocumentSnapshot, type QuerySnapshot, type Transaction as FirestoreTransaction } from "firebase/firestore";
import { collections } from "../firebase/collections";
import { firestore } from "../firebase/config";
import type { MonthlySummary } from "../types/monthlySummary";
import type { Transaction } from "../types/transaction";
import { monthKey } from "../utils/date";
import { createConverter } from "./firestoreConverters";

const monthlySummaryConverter = createConverter<MonthlySummary>();
const transactionConverter = createConverter<Transaction>();

export function monthlySummaryId(userId: string, key: string) {
  return `${userId}_${key}`;
}

export function monthlySummaryDelta(transaction: Pick<Transaction, "amountInCents" | "categoryId" | "date" | "type">, multiplier = 1) {
  const incomeInCents = transaction.type === "INCOME" ? transaction.amountInCents * multiplier : 0;
  const expenseInCents = transaction.type === "EXPENSE" ? transaction.amountInCents * multiplier : 0;
  const categoryId = transaction.type === "EXPENSE" ? transaction.categoryId : undefined;
  return {
    monthKey: monthKey(transaction.date),
    incomeInCents,
    expenseInCents,
    transactionCount: multiplier,
    categorySpending: categoryId ? { [categoryId]: expenseInCents } : {},
  };
}

export function applyMonthlySummaryDelta(dbTransaction: FirestoreTransaction, userId: string, transaction: Pick<Transaction, "amountInCents" | "categoryId" | "date" | "type">, multiplier = 1) {
  const delta = monthlySummaryDelta(transaction, multiplier);
  const summaryRef = doc(firestore, collections.monthlySummaries, monthlySummaryId(userId, delta.monthKey));
  dbTransaction.set(summaryRef, {
    userId,
    monthKey: delta.monthKey,
    incomeInCents: increment(delta.incomeInCents),
    expenseInCents: increment(delta.expenseInCents),
    transactionCount: increment(delta.transactionCount),
    categorySpending: Object.fromEntries(
      Object.entries(delta.categorySpending).map(([categoryId, value]) => [categoryId, increment(value)]),
    ),
    updatedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
  }, { merge: true });
}

export async function listMonthlySummaries(userId: string, startMonthKey: string, endMonthKey: string) {
  const snapshot = await getDocs(
    query(
      collection(firestore, collections.monthlySummaries).withConverter(monthlySummaryConverter),
      where("userId", "==", userId),
      where("monthKey", ">=", startMonthKey),
      where("monthKey", "<=", endMonthKey),
    ),
  );
  return snapshot.docs.map((item) => item.data()).sort((left, right) => left.monthKey.localeCompare(right.monthKey));
}

export async function rebuildMonthlySummaries(userId: string, startDate: Date, endDate: Date) {
  const transactions = await listAllTransactionsForSummary(userId, startDate, endDate);
  const byMonth = new Map<string, MonthlySummary>();
  transactions.forEach((transaction) => {
    const key = monthKey(transaction.date);
    const current = byMonth.get(key) ?? {
      id: monthlySummaryId(userId, key),
      userId,
      monthKey: key,
      incomeInCents: 0,
      expenseInCents: 0,
      transactionCount: 0,
      categorySpending: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (transaction.type === "INCOME") current.incomeInCents += transaction.amountInCents;
    if (transaction.type === "EXPENSE") {
      current.expenseInCents += transaction.amountInCents;
      const categoryId = transaction.categoryId ?? "uncategorized";
      current.categorySpending[categoryId] = (current.categorySpending[categoryId] ?? 0) + transaction.amountInCents;
    }
    current.transactionCount += 1;
    byMonth.set(key, current);
  });

  const batch = writeBatch(firestore);
  Array.from(byMonth.values()).forEach((summary) => {
    batch.set(doc(firestore, collections.monthlySummaries, summary.id), {
      ...summary,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
  await batch.commit();
  return byMonth.size;
}

async function listAllTransactionsForSummary(userId: string, startDate: Date, endDate: Date) {
  const transactions: Transaction[] = [];
  let cursor: DocumentSnapshot | null = null;
  let hasMore = true;
  while (hasMore) {
    const snapshot: QuerySnapshot<Transaction> = await getDocs(query(
      collection(firestore, collections.transactions).withConverter(transactionConverter),
      where("userId", "==", userId),
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", Timestamp.fromDate(endDate)),
      orderBy("date", "desc"),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(500),
    ));
    transactions.push(...snapshot.docs.map((item: DocumentSnapshot<Transaction>) => item.data() as Transaction));
    cursor = snapshot.docs.at(-1) ?? null;
    hasMore = snapshot.docs.length === 500;
  }
  return transactions;
}
