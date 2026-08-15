import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  startAfter,
  where,
  type DocumentSnapshot,
  type Firestore,
  type QueryConstraint,
} from "firebase/firestore";
import { collections } from "../firebase/collections";
import { firestore } from "../firebase/config";
import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { Transaction, TransactionFilters, TransactionType } from "../types/transaction";
import { createConverter } from "./firestoreConverters";
import { applyMonthlySummaryDelta } from "./monthlySummariesService";

const transactionConverter = createConverter<Transaction>();
const accountConverter = createConverter<Account>();

export type TransactionInput = {
  amountInCents: number;
  type: TransactionType;
  categoryId?: string;
  accountId: string;
  destinationAccountId?: string;
  date: Date;
  description?: string;
};

export type TransactionPage = {
  items: Transaction[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
};

export function buildRecentTransactionsQuery(db: Firestore, userId: string, pageSize = 25) {
  return query(
    collection(db, collections.transactions).withConverter(transactionConverter),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(pageSize),
  );
}

export async function listTransactionsPage(userId: string, filters: TransactionFilters, pageSize = 25, cursor?: DocumentSnapshot | null): Promise<TransactionPage> {
  const constraints: QueryConstraint[] = [where("userId", "==", userId)];
  if (filters.type && filters.type !== "ALL") constraints.push(where("type", "==", filters.type));
  if (filters.categoryId) constraints.push(where("categoryId", "==", filters.categoryId));
  if (filters.startDate) constraints.push(where("date", ">=", Timestamp.fromDate(filters.startDate)));
  if (filters.endDate) constraints.push(where("date", "<=", Timestamp.fromDate(filters.endDate)));
  constraints.push(orderBy("date", "desc"));
  const collectionRef = collection(firestore, collections.transactions).withConverter(transactionConverter);
  const requiresClientFiltering = hasClientSideFilters(filters);
  let pageCursor = cursor ?? null;
  let lastScannedDoc: DocumentSnapshot | null = cursor ?? null;
  let hasMore = false;
  const items: Transaction[] = [];

  // Firestore nao oferece busca parcial case-insensitive; filtros assim varrem paginas internas antes de expor a pagina ao usuario.
  do {
    const pageConstraints = [...constraints];
    if (pageCursor) pageConstraints.push(startAfter(pageCursor));
    pageConstraints.push(limit(pageSize));

    const snapshot = await getDocs(query(collectionRef, ...pageConstraints));
    lastScannedDoc = snapshot.docs.at(-1) ?? lastScannedDoc;
    pageCursor = lastScannedDoc;
    items.push(...snapshot.docs.map((item) => item.data()).filter((item) => matchesClientSideFilters(item, filters)));
    hasMore = snapshot.docs.length === pageSize;
  } while (requiresClientFiltering && items.length < pageSize && hasMore);

  return {
    items: items.slice(0, pageSize),
    lastDoc: lastScannedDoc,
    hasMore,
  };
}

export async function createTransaction(userId: string, input: TransactionInput, accounts: Account[], categories: Category[]) {
  validateTransactionInput(input, accounts, categories, userId);
  const now = Timestamp.now();
  const payload = toFirestorePayload(userId, input, now, true);
  const transactionRef = doc(collection(firestore, collections.transactions));

  await runTransaction(firestore, async (dbTransaction) => {
    await applyBalanceDeltas(dbTransaction, balanceDeltas(input));
    applyMonthlySummaryDelta(dbTransaction, userId, { ...input, categoryId: input.type === "TRANSFER" ? undefined : input.categoryId });
    dbTransaction.set(transactionRef, payload);
  });
}

export async function updateTransaction(transactionId: string, input: TransactionInput, accounts: Account[], categories: Category[], userId: string) {
  validateTransactionInput(input, accounts, categories, userId);
  const transactionRef = doc(firestore, collections.transactions, transactionId);

  await runTransaction(firestore, async (dbTransaction) => {
    const snapshot = await dbTransaction.get(transactionRef);
    if (!snapshot.exists()) throw new Error("Lancamento nao encontrado.");
    const previous = snapshot.data() as Transaction;
    await applyBalanceDeltas(dbTransaction, [...reverseBalanceDeltas(previous), ...balanceDeltas(input)]);
    applyMonthlySummaryDelta(dbTransaction, userId, previous, -1);
    applyMonthlySummaryDelta(dbTransaction, userId, { ...input, categoryId: input.type === "TRANSFER" ? undefined : input.categoryId });
    dbTransaction.update(transactionRef, {
      ...toFirestorePayload(userId, input, Timestamp.now(), false),
    });
  });
}

export async function deleteTransaction(transactionId: string) {
  const transactionRef = doc(firestore, collections.transactions, transactionId);

  await runTransaction(firestore, async (dbTransaction) => {
    const snapshot = await dbTransaction.get(transactionRef);
    if (!snapshot.exists()) return;
    const previous = snapshot.data() as Transaction;
    await applyBalanceDeltas(dbTransaction, reverseBalanceDeltas(previous));
    applyMonthlySummaryDelta(dbTransaction, previous.userId, previous, -1);
    dbTransaction.delete(transactionRef);
  });
}

function toFirestorePayload(userId: string, input: TransactionInput, now: Timestamp, includeCreatedAt: boolean) {
  const payload = {
    userId,
    amountInCents: input.amountInCents,
    type: input.type,
    categoryId: input.type === "TRANSFER" ? null : input.categoryId,
    accountId: input.accountId,
    destinationAccountId: input.type === "TRANSFER" ? input.destinationAccountId : null,
    date: Timestamp.fromDate(input.date),
    description: input.description?.trim() || null,
    updatedAt: now,
  };
  return includeCreatedAt ? { ...payload, createdAt: now } : payload;
}

function validateTransactionInput(input: TransactionInput, accounts: Account[], categories: Category[], userId: string) {
  if (input.amountInCents <= 0) throw new Error("Informe um valor maior que zero.");
  const origin = accounts.find((account) => account.id === input.accountId && account.userId === userId);
  if (!origin) throw new Error("Selecione uma conta.");
  if (origin.status === "ARCHIVED") throw new Error("Conta arquivada não recebe novos lançamentos.");

  if (input.type === "TRANSFER") {
    if (!input.destinationAccountId) throw new Error("Selecione a conta de destino.");
    if (input.destinationAccountId === input.accountId) throw new Error("Origem e destino precisam ser diferentes.");
    const destination = accounts.find((account) => account.id === input.destinationAccountId && account.userId === userId);
    if (!destination) throw new Error("Selecione uma conta de destino válida.");
    if (destination.status === "ARCHIVED") throw new Error("Conta arquivada não recebe novos lançamentos.");
    return;
  }

  const category = categories.find((item) => item.id === input.categoryId && item.userId === userId);
  if (!category || category.status === "ARCHIVED") throw new Error("Selecione uma categoria ativa.");
  if (input.type === "INCOME" && category.type !== "INCOME") throw new Error("Receitas exigem categoria de receita.");
  if (input.type === "EXPENSE" && category.type !== "EXPENSE") throw new Error("Despesas exigem categoria de despesa.");
}

type BalanceDelta = {
  accountId: string;
  deltaInCents: number;
};

type TransactionRunner = Parameters<Parameters<typeof runTransaction>[1]>[0];

export function balanceDeltas(input: TransactionInput | Transaction): BalanceDelta[] {
  if (input.type === "INCOME") return [{ accountId: input.accountId, deltaInCents: input.amountInCents }];
  if (input.type === "EXPENSE") return [{ accountId: input.accountId, deltaInCents: -input.amountInCents }];
  return [
    { accountId: input.accountId, deltaInCents: -input.amountInCents },
    { accountId: input.destinationAccountId ?? "", deltaInCents: input.amountInCents },
  ].filter((delta) => delta.accountId);
}

export function reverseBalanceDeltas(input: TransactionInput | Transaction) {
  return balanceDeltas(input).map((delta) => ({ ...delta, deltaInCents: -delta.deltaInCents }));
}

async function applyBalanceDeltas(dbTransaction: TransactionRunner, deltas: BalanceDelta[]) {
  const mergedDeltas = mergeBalanceDeltas(deltas);
  const accountSnapshots = await Promise.all(
    mergedDeltas.map(async (delta) => {
      const accountRef = doc(firestore, collections.accounts, delta.accountId).withConverter(accountConverter);
      const snapshot = await dbTransaction.get(accountRef);
      return { accountRef, snapshot, delta };
    }),
  );

  for (const { accountRef, delta, snapshot } of accountSnapshots) {
    if (!snapshot.exists()) throw new Error("Conta nao encontrada.");
    const account = snapshot.data();
    dbTransaction.update(accountRef, {
      currentBalanceInCents: account.currentBalanceInCents + delta.deltaInCents,
      updatedAt: Timestamp.now(),
    });
  }
}

export function mergeBalanceDeltas(deltas: BalanceDelta[]) {
  const byAccount = new Map<string, number>();
  for (const delta of deltas) {
    byAccount.set(delta.accountId, (byAccount.get(delta.accountId) ?? 0) + delta.deltaInCents);
  }
  return Array.from(byAccount.entries()).map(([accountId, deltaInCents]) => ({ accountId, deltaInCents }));
}

function hasClientSideFilters(filters: TransactionFilters) {
  return Boolean(filters.accountId || filters.minAmountInCents !== undefined || filters.maxAmountInCents !== undefined || filters.search?.trim());
}

function matchesClientSideFilters(item: Transaction, filters: TransactionFilters) {
  if (filters.accountId && item.accountId !== filters.accountId && item.destinationAccountId !== filters.accountId) return false;
  if (filters.minAmountInCents !== undefined && item.amountInCents < filters.minAmountInCents) return false;
  if (filters.maxAmountInCents !== undefined && item.amountInCents > filters.maxAmountInCents) return false;
  if (filters.search?.trim()) {
    const search = filters.search.trim().toLowerCase();
    return Boolean(item.description?.toLowerCase().includes(search));
  }
  return true;
}
