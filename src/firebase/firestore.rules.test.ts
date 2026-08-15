/**
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

const projectId = "fincontrol-rules-test";
const userA = "user-a";
const userB = "user-b";
const now = Timestamp.fromDate(new Date("2026-08-14T12:00:00.000Z"));

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

function authedDb(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

function accountData(userId = userA) {
  return {
    userId,
    createdAt: now,
    updatedAt: now,
    name: "Conta corrente",
    type: "CHECKING",
    initialBalanceInCents: 125000,
    currentBalanceInCents: 125000,
    institution: "Banco",
    color: "#059669",
    icon: "Landmark",
    status: "ACTIVE",
  };
}

function categoryData(userId = userA) {
  return {
    userId,
    createdAt: now,
    updatedAt: now,
    name: "Alimentacao",
    type: "EXPENSE",
    icon: "Tag",
    color: "#2563eb",
    status: "ACTIVE",
    isDefault: false,
  };
}

function transactionData(userId = userA) {
  return {
    userId,
    createdAt: now,
    updatedAt: now,
    description: "Mercado",
    amountInCents: 3290,
    date: now,
    type: "EXPENSE",
    accountId: "account-a",
    categoryId: "category-a",
  };
}

function cardData(userId = userA) {
  return {
    userId,
    createdAt: now,
    updatedAt: now,
    name: "Visa Gold",
    institution: "Banco",
    limitInCents: 500000,
    committedLimitInCents: 0,
    closingDay: 10,
    dueDay: 20,
    color: "#2563eb",
    status: "ACTIVE",
  };
}

function invoiceData(userId = userA) {
  return {
    userId,
    createdAt: now,
    updatedAt: now,
    cardId: "card-a",
    cycleKey: "2026-08",
    totalInCents: 10000,
    paidInCents: 0,
    closingDate: now,
    dueDate: now,
    status: "OPEN",
  };
}

function recurringTransactionData(userId = userA) {
  return {
    userId,
    createdAt: now,
    updatedAt: now,
    amountInCents: 45000,
    type: "EXPENSE",
    targetType: "ACCOUNT",
    frequency: "MONTHLY",
    status: "ACTIVE",
    categoryId: "category-a",
    accountId: "account-a",
    description: "Aluguel",
    startDate: now,
    nextOccurrenceDate: now,
  };
}

async function seedPrivateDoc(collectionName: string, id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), collectionName, id), data);
  });
}

describe("Firestore security rules", () => {
  it("allows users to read only their own financial documents", async () => {
    await seedPrivateDoc("accounts", "own-account", accountData(userA));
    await seedPrivateDoc("accounts", "other-account", accountData(userB));

    const dbA = authedDb(userA);

    await assertSucceeds(getDoc(doc(dbA, "accounts", "own-account")));
    await assertFails(getDoc(doc(dbA, "accounts", "other-account")));
    await assertSucceeds(getDocs(query(collection(dbA, "accounts"), where("userId", "==", userA))));
    await assertFails(getDocs(query(collection(dbA, "accounts"), where("userId", "==", userB))));
    await assertFails(getDocs(collection(dbA, "accounts")));
  });

  it("requires created financial documents to belong to the authenticated user", async () => {
    const dbA = authedDb(userA);

    await assertSucceeds(setDoc(doc(dbA, "accounts", "account-a"), accountData(userA)));
    await assertSucceeds(setDoc(doc(dbA, "categories", "category-a"), categoryData(userA)));
    await assertFails(setDoc(doc(dbA, "accounts", "spoofed-account"), accountData(userB)));
    await assertFails(setDoc(doc(dbA, "transactions", "spoofed-transaction"), transactionData(userB)));
  });

  it("prevents changing userId on existing financial documents", async () => {
    await seedPrivateDoc("accounts", "account-a", accountData(userA));
    const dbA = authedDb(userA);

    await assertSucceeds(updateDoc(doc(dbA, "accounts", "account-a"), { name: "Reserva", updatedAt: now }));
    await assertFails(updateDoc(doc(dbA, "accounts", "account-a"), { userId: userB, updatedAt: now }));
  });

  it("prevents users from modifying or deleting another user's documents", async () => {
    await seedPrivateDoc("transactions", "transaction-b", transactionData(userB));
    const dbA = authedDb(userA);

    await assertFails(updateDoc(doc(dbA, "transactions", "transaction-b"), { description: "Alterado", updatedAt: now }));
    await assertFails(deleteDoc(doc(dbA, "transactions", "transaction-b")));
  });

  it("validates fundamental fields for known private collections", async () => {
    const dbA = authedDb(userA);
    const invalidAccount = {
      userId: userA,
      createdAt: now,
      updatedAt: now,
      name: "Sem saldo",
      status: "ACTIVE",
    };
    const invalidTransaction = {
      ...transactionData(userA),
      type: "unsupported",
    };
    const invalidCategory = {
      ...categoryData(userA),
      type: "TRANSFER",
    };

    await assertFails(setDoc(doc(dbA, "accounts", "invalid-account"), invalidAccount));
    await assertFails(setDoc(doc(dbA, "transactions", "invalid-transaction"), invalidTransaction));
    await assertFails(setDoc(doc(dbA, "categories", "invalid-category"), invalidCategory));
  });

  it("prevents deleting categories and changing default category ownership flags incorrectly", async () => {
    await seedPrivateDoc("categories", "category-a", { ...categoryData(userA), isDefault: true });
    const dbA = authedDb(userA);

    await assertSucceeds(updateDoc(doc(dbA, "categories", "category-a"), { status: "ARCHIVED", updatedAt: now }));
    await assertFails(updateDoc(doc(dbA, "categories", "category-a"), { isDefault: false, updatedAt: now }));
    await assertFails(deleteDoc(doc(dbA, "categories", "category-a")));
  });

  it("allows repairing legacy owned categories and accounts with valid private schemas", async () => {
    await seedPrivateDoc("categories", "legacy-category", { userId: userA, name: "Outros" });
    await seedPrivateDoc("accounts", "legacy-account", { userId: userA, name: "Conta antiga", balanceInCents: 100000, archived: false });
    const dbA = authedDb(userA);

    await assertSucceeds(setDoc(doc(dbA, "categories", "legacy-category"), categoryData(userA), { merge: true }));
    await assertSucceeds(updateDoc(doc(dbA, "accounts", "legacy-account"), {
      userId: userA,
      createdAt: now,
      updatedAt: now,
      name: "Conta antiga",
      type: "CHECKING",
      initialBalanceInCents: 100000,
      currentBalanceInCents: 100000,
      color: "#059669",
      icon: "Landmark",
      status: "ACTIVE",
    }));
  });

  it("keeps salary, balance, expense, cards, history, and goals collections non-public", async () => {
    await seedPrivateDoc("cards", "card-a", {
      userId: userA,
      createdAt: now,
      updatedAt: now,
      name: "Cartao",
      limitInCents: 300000,
    });

    const dbA = authedDb(userA);
    const dbB = authedDb(userB);
    const publicDb = testEnv.unauthenticatedContext().firestore();
    const privateCollections = ["salaries", "balances", "expenses", "history", "goals", "salarios", "saldos", "gastos", "historico", "metas"];

    await assertSucceeds(getDoc(doc(dbA, "cards", "card-a")));
    await assertFails(getDoc(doc(dbB, "cards", "card-a")));
    await assertFails(getDoc(doc(publicDb, "cards", "card-a")));

    for (const collectionName of privateCollections) {
      await assertSucceeds(setDoc(doc(dbA, collectionName, "own-doc"), { userId: userA, createdAt: now, updatedAt: now }));
      await assertFails(setDoc(doc(dbA, collectionName, "spoofed-doc"), { userId: userB, createdAt: now, updatedAt: now }));
      await assertFails(setDoc(doc(publicDb, collectionName, "public-doc"), { userId: userA, createdAt: now, updatedAt: now }));
    }
  });

  it("restricts user profiles to the matching authenticated user", async () => {
    const dbA = authedDb(userA);
    const dbB = authedDb(userB);
    const profileA = {
      id: userA,
      email: "a@example.com",
      displayName: "User A",
      locale: "pt-BR",
      currency: "BRL",
      timeZone: "America/Sao_Paulo",
    };

    await assertSucceeds(setDoc(doc(dbA, "users", userA), profileA));
    await assertFails(getDoc(doc(dbB, "users", userA)));
    await assertFails(setDoc(doc(dbA, "users", userB), { ...profileA, id: userB }));
    await assertFails(updateDoc(doc(dbA, "users", userA), { id: userB }));

    const storedProfile = await getDoc(doc(dbA, "users", userA));
    expect(storedProfile.exists()).toBe(true);
  });

  it("denies undeclared collections by default", async () => {
    const dbA = authedDb(userA);

    await assertFails(setDoc(doc(dbA, "publicReports", "report-a"), { userId: userA, createdAt: now, updatedAt: now }));
    await assertFails(getDoc(doc(dbA, "publicReports", "report-a")));
  });

  it("supports the financial workflow while preserving user isolation", async () => {
    const dbA = authedDb(userA);
    const dbB = authedDb(userB);
    const accountRef = doc(dbA, "accounts", "workflow-account");
    const categoryRef = doc(dbA, "categories", "workflow-category");
    const expenseRef = doc(dbA, "transactions", "workflow-expense");
    const incomeCategoryRef = doc(dbA, "categories", "workflow-income-category");
    const incomeRef = doc(dbA, "transactions", "workflow-income");

    await assertSucceeds(setDoc(accountRef, {
      ...accountData(userA),
      initialBalanceInCents: 100000,
      currentBalanceInCents: 100000,
    }));
    await assertSucceeds(setDoc(categoryRef, categoryData(userA)));
    await assertSucceeds(setDoc(incomeCategoryRef, {
      ...categoryData(userA),
      name: "Receita personalizada",
      type: "INCOME",
    }));

    await assertSucceeds(runTransaction(dbA, async (transaction) => {
      const account = await transaction.get(accountRef);
      transaction.update(accountRef, {
        currentBalanceInCents: account.data()?.currentBalanceInCents - 10000,
        updatedAt: now,
      });
      transaction.set(expenseRef, {
        ...transactionData(userA),
        amountInCents: 10000,
        description: "Despesa de teste",
        accountId: "workflow-account",
        categoryId: "workflow-category",
      });
    }));

    expect((await getDoc(accountRef)).data()?.currentBalanceInCents).toBe(90000);

    await assertSucceeds(runTransaction(dbA, async (transaction) => {
      const account = await transaction.get(accountRef);
      transaction.update(accountRef, {
        currentBalanceInCents: account.data()?.currentBalanceInCents + 200000,
        updatedAt: now,
      });
      transaction.set(incomeRef, {
        ...transactionData(userA),
        amountInCents: 200000,
        description: "Receita de teste",
        type: "INCOME",
        accountId: "workflow-account",
        categoryId: "workflow-income-category",
      });
    }));

    expect((await getDoc(accountRef)).data()?.currentBalanceInCents).toBe(290000);
    await assertSucceeds(getDoc(expenseRef));
    await assertSucceeds(getDoc(incomeRef));
    await assertFails(getDoc(doc(dbB, "accounts", "workflow-account")));
    await assertFails(getDoc(doc(dbB, "categories", "workflow-category")));
    await assertFails(getDoc(doc(dbB, "transactions", "workflow-expense")));
  });

  it("supports credit card purchase, invoice, and payment isolation", async () => {
    const dbA = authedDb(userA);
    const dbB = authedDb(userB);
    const cardRef = doc(dbA, "cards", "card-a");
    const invoiceRef = doc(dbA, "cardInvoices", "card-a_2026-08");
    const purchaseRef = doc(dbA, "cardPurchases", "purchase-a");
    const installmentRef = doc(dbA, "cardInstallments", "purchase-a_1");
    const paymentRef = doc(dbA, "cardPayments", "payment-a");
    const accountRef = doc(dbA, "accounts", "payment-account");
    const cardCategoryRef = doc(dbA, "categories", "card-category");

    await assertSucceeds(setDoc(cardRef, cardData(userA)));
    await assertSucceeds(setDoc(doc(dbA, "cards", "unused-card"), cardData(userA)));
    await assertFails(deleteDoc(doc(dbB, "cards", "unused-card")));
    await assertSucceeds(deleteDoc(doc(dbA, "cards", "unused-card")));
    await assertSucceeds(setDoc(cardCategoryRef, categoryData(userA)));
    await assertSucceeds(setDoc(accountRef, {
      ...accountData(userA),
      initialBalanceInCents: 100000,
      currentBalanceInCents: 100000,
    }));
    await assertSucceeds(getDoc(doc(dbA, "cardPurchases", "missing-purchase")));
    await assertSucceeds(getDoc(doc(dbA, "cardInvoices", "missing-invoice")));
    await assertSucceeds(getDoc(doc(dbA, "cardInstallments", "missing-installment")));
    await assertSucceeds(runTransaction(dbA, async (transaction) => {
      const missingPurchase = await transaction.get(purchaseRef);
      const missingInvoice = await transaction.get(invoiceRef);
      const missingInstallment = await transaction.get(installmentRef);
      expect(missingPurchase.exists()).toBe(false);
      expect(missingInvoice.exists()).toBe(false);
      expect(missingInstallment.exists()).toBe(false);
    }));

    await assertSucceeds(runTransaction(dbA, async (transaction) => {
      const card = await transaction.get(cardRef);
      transaction.update(cardRef, { committedLimitInCents: card.data()?.committedLimitInCents + 10000, updatedAt: now });
      transaction.set(purchaseRef, {
        userId: userA,
        createdAt: now,
        updatedAt: now,
        cardId: "card-a",
        categoryId: "card-category",
        description: "Compra teste",
        amountInCents: 10000,
        purchaseDate: now,
        installmentsCount: 1,
        firstInstallmentDate: now,
        idempotencyKey: "purchase-a",
      });
      transaction.set(invoiceRef, invoiceData(userA));
      transaction.set(installmentRef, {
        userId: userA,
        createdAt: now,
        updatedAt: now,
        purchaseId: "purchase-a",
        cardId: "card-a",
        categoryId: "card-category",
        invoiceId: "card-a_2026-08",
        installmentNumber: 1,
        installmentsCount: 1,
        amountInCents: 10000,
        dueDate: now,
        description: "Compra teste",
        status: "OPEN",
      });
    }));
    await assertSucceeds(setDoc(doc(dbA, "cardPurchases", "purchase-editable"), {
      userId: userA,
      createdAt: now,
      updatedAt: now,
      cardId: "card-a",
      description: "Compra editavel",
      amountInCents: 5000,
      purchaseDate: now,
      installmentsCount: 1,
      firstInstallmentDate: now,
      idempotencyKey: "purchase-editable",
    }));
    await assertSucceeds(setDoc(doc(dbA, "cardInstallments", "purchase-editable_1"), {
      userId: userA,
      createdAt: now,
      updatedAt: now,
      purchaseId: "purchase-editable",
      cardId: "card-a",
      invoiceId: "card-a_2026-08",
      installmentNumber: 1,
      installmentsCount: 1,
      amountInCents: 5000,
      dueDate: now,
      description: "Compra editavel",
      status: "OPEN",
    }));
    await assertSucceeds(updateDoc(doc(dbA, "cardPurchases", "purchase-editable"), {
      description: "Compra editada",
      amountInCents: 6000,
      updatedAt: now,
    }));
    await assertFails(updateDoc(doc(dbB, "cardPurchases", "purchase-editable"), {
      description: "Compra invadida",
      updatedAt: now,
    }));
    await assertFails(deleteDoc(doc(dbB, "cardPurchases", "purchase-editable")));
    await assertSucceeds(deleteDoc(doc(dbA, "cardInstallments", "purchase-editable_1")));
    await assertSucceeds(deleteDoc(doc(dbA, "cardPurchases", "purchase-editable")));
    await assertSucceeds(setDoc(doc(dbA, "cardInvoices", "card-a_2026-09"), {
      ...invoiceData(userA),
      cycleKey: "2026-09",
    }));
    await assertFails(deleteDoc(doc(dbB, "cardInvoices", "card-a_2026-09")));
    await assertSucceeds(deleteDoc(doc(dbA, "cardInvoices", "card-a_2026-09")));
    await assertSucceeds(setDoc(doc(dbA, "cardPayments", "payment-delete"), {
      userId: userA,
      createdAt: now,
      updatedAt: now,
      cardId: "card-a",
      invoiceId: "card-a_2026-08",
      accountId: "payment-account",
      amountInCents: 1000,
      paidAt: now,
    }));
    await assertFails(deleteDoc(doc(dbB, "cardPayments", "payment-delete")));
    await assertSucceeds(deleteDoc(doc(dbA, "cardPayments", "payment-delete")));

    await assertSucceeds(runTransaction(dbA, async (transaction) => {
      const card = await transaction.get(cardRef);
      const account = await transaction.get(accountRef);
      transaction.update(accountRef, { currentBalanceInCents: account.data()?.currentBalanceInCents - 10000, updatedAt: now });
      transaction.update(cardRef, { committedLimitInCents: card.data()?.committedLimitInCents - 10000, updatedAt: now });
      transaction.update(invoiceRef, { paidInCents: 10000, status: "PAID", updatedAt: now });
      transaction.set(paymentRef, {
        userId: userA,
        createdAt: now,
        updatedAt: now,
        cardId: "card-a",
        invoiceId: "card-a_2026-08",
        accountId: "payment-account",
        amountInCents: 10000,
        paidAt: now,
      });
    }));

    expect((await getDoc(cardRef)).data()?.committedLimitInCents).toBe(0);
    expect((await getDoc(accountRef)).data()?.currentBalanceInCents).toBe(90000);
    await assertFails(getDoc(doc(dbB, "cards", "card-a")));
    await assertFails(getDoc(doc(dbB, "cardInvoices", "card-a_2026-08")));
    await assertFails(setDoc(doc(dbB, "cardPurchases", "spoof"), {
      userId: userB,
      createdAt: now,
      updatedAt: now,
      cardId: "card-a",
      description: "Compra indevida",
      amountInCents: 10000,
      purchaseDate: now,
      installmentsCount: 1,
      firstInstallmentDate: now,
      idempotencyKey: "spoof",
    }));
  });

  it("protects recurring transactions with ownership and valid references", async () => {
    const dbA = authedDb(userA);
    const dbB = authedDb(userB);

    await assertSucceeds(setDoc(doc(dbA, "accounts", "account-a"), accountData(userA)));
    await assertSucceeds(setDoc(doc(dbA, "categories", "category-a"), categoryData(userA)));
    await assertSucceeds(setDoc(doc(dbA, "recurringTransactions", "rent"), recurringTransactionData(userA)));
    await assertSucceeds(updateDoc(doc(dbA, "recurringTransactions", "rent"), {
      status: "PAUSED",
      updatedAt: now,
    }));
    await assertFails(setDoc(doc(dbA, "recurringTransactions", "spoof"), recurringTransactionData(userB)));
    await assertFails(setDoc(doc(dbA, "recurringTransactions", "invalid-category"), {
      ...recurringTransactionData(userA),
      categoryId: "missing-category",
    }));
    await assertFails(getDoc(doc(dbB, "recurringTransactions", "rent")));
    await assertFails(deleteDoc(doc(dbA, "recurringTransactions", "rent")));
  });
});
