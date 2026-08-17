import { Timestamp, collection, doc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { calculateBudgetUsage } from "../business/budgets";
import { collections } from "../firebase/collections";
import { firestore } from "../firebase/config";
import type { Budget, BudgetStatus } from "../types/budget";
import type { CardPurchase } from "../types/creditCard";
import type { Transaction } from "../types/transaction";
import { createConverter } from "./firestoreConverters";

const budgetConverter = createConverter<Budget>();
const transactionConverter = createConverter<Transaction>();
const purchaseConverter = createConverter<CardPurchase>();

export type BudgetInput = {
  name: string;
  categoryId: string;
  limitInCents: number;
  startDate: Date;
  endDate: Date;
  status?: BudgetStatus;
};

export async function listBudgets(userId: string) {
  const snapshot = await getDocs(query(
    collection(firestore, collections.budgets).withConverter(budgetConverter),
    where("userId", "==", userId),
    orderBy("startDate", "desc"),
    limit(100),
  ));
  return snapshot.docs.map((item) => item.data());
}

export async function listBudgetsWithUsage(userId: string) {
  const budgets = await listBudgets(userId);
  if (budgets.length === 0) return [];
  const startDate = new Date(Math.min(...budgets.map((item) => item.startDate.getTime())));
  const endDate = new Date(Math.max(...budgets.map((item) => item.endDate.getTime())));
  const [transactionSnapshot, purchaseSnapshot] = await Promise.all([
    getDocs(query(
      collection(firestore, collections.transactions).withConverter(transactionConverter),
      where("userId", "==", userId), where("date", ">=", Timestamp.fromDate(startDate)), where("date", "<=", Timestamp.fromDate(endDate)),
      orderBy("date", "desc"), limit(500),
    )),
    getDocs(query(
      collection(firestore, collections.cardPurchases).withConverter(purchaseConverter),
      where("userId", "==", userId), where("purchaseDate", ">=", Timestamp.fromDate(startDate)), where("purchaseDate", "<=", Timestamp.fromDate(endDate)),
      orderBy("purchaseDate", "desc"), limit(500),
    )),
  ]);
  const transactions = transactionSnapshot.docs.map((item) => item.data());
  const purchases = purchaseSnapshot.docs.map((item) => item.data());
  return budgets.map((budget) => calculateBudgetUsage(budget, transactions, purchases));
}

export async function createBudget(userId: string, input: BudgetInput) {
  validateBudget(input);
  const now = Timestamp.now();
  await setDoc(doc(collection(firestore, collections.budgets)), toPayload(userId, input, now, true));
}

export async function updateBudget(userId: string, budgetId: string, input: BudgetInput) {
  validateBudget(input);
  await updateDoc(doc(firestore, collections.budgets, budgetId), toPayload(userId, input, Timestamp.now(), false));
}

export async function archiveBudget(budgetId: string) {
  await updateDoc(doc(firestore, collections.budgets, budgetId), { status: "ARCHIVED", updatedAt: Timestamp.now() });
}

function toPayload(userId: string, input: BudgetInput, now: Timestamp, create: boolean) {
  const payload = {
    userId, name: input.name.trim(), categoryId: input.categoryId, limitInCents: input.limitInCents,
    startDate: Timestamp.fromDate(input.startDate), endDate: Timestamp.fromDate(input.endDate),
    status: input.status ?? "ACTIVE", updatedAt: now,
  };
  return create ? { ...payload, createdAt: now } : payload;
}

function validateBudget(input: BudgetInput) {
  if (!input.name.trim()) throw new Error("Informe o nome do orcamento.");
  if (!input.categoryId) throw new Error("Selecione uma categoria.");
  if (!Number.isInteger(input.limitInCents) || input.limitInCents <= 0) throw new Error("Informe um limite maior que zero.");
  if (input.endDate < input.startDate) throw new Error("O fim do periodo deve ser posterior ao inicio.");
}
