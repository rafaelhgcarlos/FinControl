import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { collections } from "../firebase/collections";
import { firestore } from "../firebase/config";
import type { Account, AccountStatus, AccountType } from "../types/account";
import type { Transaction } from "../types/transaction";
import { createConverter } from "./firestoreConverters";

const accountConverter = createConverter<Account>();
const transactionConverter = createConverter<Transaction>();

export const accountTypes: Array<{ value: AccountType; label: string }> = [
  { value: "CHECKING", label: "Conta Corrente" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "WALLET", label: "Carteira" },
  { value: "DIGITAL", label: "Conta Digital" },
  { value: "CASH", label: "Dinheiro" },
  { value: "INVESTMENTS", label: "Investimentos" },
];

export type AccountInput = {
  name: string;
  type: AccountType;
  initialBalanceInCents: number;
  institution?: string;
  color: string;
  icon: string;
  status: AccountStatus;
};

export function buildAccountsQuery(db: Firestore, userId: string, pageSize = 100) {
  return query(
    collection(db, collections.accounts).withConverter(accountConverter),
    where("userId", "==", userId),
    limit(pageSize),
  );
}

export function buildActiveAccountsQuery(db: Firestore, userId: string, pageSize = 50) {
  return query(
    collection(db, collections.accounts).withConverter(accountConverter),
    where("userId", "==", userId),
    where("status", "==", "ACTIVE"),
    limit(pageSize),
  );
}

export async function listAccounts(userId: string) {
  const snapshot = await getDocs(buildAccountsQuery(firestore, userId));
  const accounts = snapshot.docs.map((item) => {
    const account = normalizeAccount(item.id, item.data() as Partial<Account> & { balanceInCents?: number; archived?: boolean });
    if (needsAccountMigration(item.data() as Partial<Account>)) {
      void updateDoc(doc(firestore, collections.accounts, item.id), {
        userId: account.userId,
        createdAt: account.createdAt,
        name: account.name,
        initialBalanceInCents: account.initialBalanceInCents,
        currentBalanceInCents: account.currentBalanceInCents,
        type: account.type,
        color: account.color,
        icon: account.icon,
        status: account.status,
        updatedAt: Timestamp.now(),
      }).catch(() => undefined);
    }
    return account;
  });
  return accounts.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export async function createAccount(userId: string, input: AccountInput) {
  const now = Timestamp.now();
  await addDoc(collection(firestore, collections.accounts), {
    ...input,
    institution: input.institution?.trim() || null,
    currentBalanceInCents: input.initialBalanceInCents,
    userId,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateAccount(accountId: string, changes: AccountInput) {
  const accountRef = doc(firestore, collections.accounts, accountId).withConverter(accountConverter);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(accountRef);
    if (!snapshot.exists()) throw new Error("Conta nao encontrada.");
    const previous = snapshot.data();
    const initialBalanceDelta = changes.initialBalanceInCents - previous.initialBalanceInCents;
    transaction.update(accountRef, {
      ...changes,
      institution: changes.institution?.trim() || null,
      currentBalanceInCents: previous.currentBalanceInCents + initialBalanceDelta,
      updatedAt: Timestamp.now(),
    });
  });
}

export async function archiveAccount(accountId: string) {
  await updateDoc(doc(firestore, collections.accounts, accountId), {
    status: "ARCHIVED",
    updatedAt: Timestamp.now(),
  });
}

export async function listAccountTransactions(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(firestore, collections.transactions).withConverter(transactionConverter),
      where("userId", "==", userId),
      limit(500),
    ),
  );
  return snapshot.docs.map((item) => item.data()).sort((left, right) => right.date.getTime() - left.date.getTime());
}

export function calculateAccountBalance(account: Account, transactions: Transaction[]) {
  return transactions.reduce((balance, transaction) => {
    if (transaction.type === "INCOME" && transaction.accountId === account.id) return balance + transaction.amountInCents;
    if (transaction.type === "EXPENSE" && transaction.accountId === account.id) return balance - transaction.amountInCents;
    if (transaction.type === "TRANSFER" && transaction.destinationAccountId === account.id) return balance + transaction.amountInCents;
    if (transaction.type === "TRANSFER" && transaction.accountId === account.id) return balance - transaction.amountInCents;
    return balance;
  }, account.initialBalanceInCents);
}

function normalizeAccount(id: string, account: Partial<Account> & { balanceInCents?: number; archived?: boolean }): Account {
  const initialBalanceInCents = account.initialBalanceInCents ?? account.balanceInCents ?? 0;
  return {
    id,
    userId: account.userId ?? "",
    createdAt: account.createdAt ?? new Date(),
    updatedAt: account.updatedAt ?? new Date(),
    name: account.name ?? "Conta",
    type: account.type ?? "CHECKING",
    initialBalanceInCents,
    currentBalanceInCents: account.currentBalanceInCents ?? account.balanceInCents ?? initialBalanceInCents,
    institution: account.institution,
    color: account.color ?? "#059669",
    icon: account.icon ?? "Landmark",
    status: account.status ?? (account.archived ? "ARCHIVED" : "ACTIVE"),
  };
}

function needsAccountMigration(account: Partial<Account>) {
  return account.createdAt === undefined
    || account.name === undefined
    || account.initialBalanceInCents === undefined
    || account.currentBalanceInCents === undefined
    || account.type === undefined
    || account.color === undefined
    || account.icon === undefined
    || account.status === undefined;
}
