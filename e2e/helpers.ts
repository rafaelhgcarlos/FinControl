import { expect, type Locator, type Page } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { Timestamp, collection, doc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";

export const testPassword = "FinControl123!";

export async function registerDisposableUser(page: Page, suffix: string) {
  const email = `mvp-${suffix}-${Date.now()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Usuario MVP");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(testPassword);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/app$/);
  return email;
}

export async function openGlobalLauncher(page: Page, mobile = false) {
  const trigger = mobile
    ? page.getByRole("navigation", { name: "Navegação inferior" }).getByRole("button", { name: "Lançar" })
    : page.locator("main > header").getByRole("button", { name: "Novo lancamento" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Novo lancamento" })).toBeVisible();
}

export async function fillCurrency(scope: Page | Locator, label: string, cents: number) {
  await scope.getByLabel(label).fill(String(cents));
}

export async function seedFinancialJourney() {
  const testEnvironment = await initializeTestEnvironment({ projectId: "demo-fincontrol" });
  try {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const allAccountsSnapshot = await getDocs(collection(db, "accounts"));
      const userId = String(allAccountsSnapshot.docs.find((item) => item.data().name === "Conta principal")?.data().userId ?? "");
      if (!userId) throw new Error("Usuario de teste nao encontrado pelas contas descartaveis.");
      const accountsSnapshot = await getDocs(query(collection(db, "accounts"), where("userId", "==", userId)));
      const categoriesSnapshot = await getDocs(query(collection(db, "categories"), where("userId", "==", userId)));
      const accounts = new Map(accountsSnapshot.docs.map((item) => [String(item.data().name), item.id]));
      const categories = categoriesSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      const principalId = accounts.get("Conta principal");
      const reserveId = accounts.get("Reserva");
      const incomeCategoryId = categories.find((item) => item.type === "INCOME")?.id;
      const expenseCategoryId = categories.find((item) => item.type === "EXPENSE")?.id;
      if (!principalId || !reserveId || !incomeCategoryId || !expenseCategoryId) throw new Error("Dados de suporte incompletos para o seed E2E.");

      const now = new Date();
      const timestamp = Timestamp.fromDate(now);
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15, 12);
      const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
      const thirdMonth = new Date(now.getFullYear(), now.getMonth() + 2, 15, 12);
      const thirdMonthKey = `${thirdMonth.getFullYear()}-${String(thirdMonth.getMonth() + 1).padStart(2, "0")}`;
      const common = { userId, createdAt: timestamp, updatedAt: timestamp };

      await Promise.all([
        updateDoc(doc(db, "accounts", principalId), { currentBalanceInCents: 115_000, updatedAt: timestamp }),
        updateDoc(doc(db, "accounts", reserveId), { currentBalanceInCents: 20_000, updatedAt: timestamp }),
        setDoc(doc(db, "transactions", "e2e-income"), { ...common, amountInCents: 100_000, type: "INCOME", categoryId: incomeCategoryId, accountId: principalId, destinationAccountId: null, date: timestamp, description: "Receita E2E" }),
        setDoc(doc(db, "transactions", "e2e-expense"), { ...common, amountInCents: 25_000, type: "EXPENSE", categoryId: expenseCategoryId, accountId: principalId, destinationAccountId: null, date: timestamp, description: "Despesa E2E" }),
        setDoc(doc(db, "transactions", "e2e-transfer"), { ...common, amountInCents: 10_000, type: "TRANSFER", categoryId: null, accountId: principalId, destinationAccountId: reserveId, date: timestamp, description: "Transferencia E2E" }),
        setDoc(doc(db, "monthlySummaries", `${userId}_${monthKey}`), { ...common, monthKey, incomeInCents: 100_000, expenseInCents: 25_000, transactionCount: 3, categorySpending: { [expenseCategoryId]: 25_000 } }),
        setDoc(doc(db, "cards", "e2e-card"), { ...common, name: "Cartao E2E", institution: "Banco E2E", lastFour: "1234", brand: "VISA", limitInCents: 200_000, committedLimitInCents: 30_000, closingDay: 10, dueDay: 20, color: "#2563eb", status: "ACTIVE" }),
        setDoc(doc(db, "cardPurchases", "e2e-purchase"), { ...common, cardId: "e2e-card", categoryId: expenseCategoryId, description: "Compra parcelada E2E", amountInCents: 30_000, purchaseDate: timestamp, installmentsCount: 3, firstInstallmentDate: timestamp, idempotencyKey: "e2e-purchase" }),
        setDoc(doc(db, "cardInvoices", `e2e-card_${monthKey}`), { ...common, cardId: "e2e-card", cycleKey: monthKey, totalInCents: 10_000, paidInCents: 0, closingDate: timestamp, dueDate: timestamp, status: "OPEN" }),
        setDoc(doc(db, "cardInvoices", `e2e-card_${nextMonthKey}`), { ...common, cardId: "e2e-card", cycleKey: nextMonthKey, totalInCents: 10_000, paidInCents: 0, closingDate: Timestamp.fromDate(nextMonth), dueDate: Timestamp.fromDate(nextMonth), status: "OPEN" }),
        setDoc(doc(db, "cardInvoices", `e2e-card_${thirdMonthKey}`), { ...common, cardId: "e2e-card", cycleKey: thirdMonthKey, totalInCents: 10_000, paidInCents: 0, closingDate: Timestamp.fromDate(thirdMonth), dueDate: Timestamp.fromDate(thirdMonth), status: "OPEN" }),
        ...[timestamp, Timestamp.fromDate(nextMonth), Timestamp.fromDate(thirdMonth)].map((dueDate, index) => setDoc(doc(db, "cardInstallments", `e2e-purchase_${index + 1}`), { ...common, purchaseId: "e2e-purchase", cardId: "e2e-card", invoiceId: `e2e-card_${[monthKey, nextMonthKey, thirdMonthKey][index]}`, installmentNumber: index + 1, installmentsCount: 3, amountInCents: 10_000, dueDate, description: "Compra parcelada E2E", categoryId: expenseCategoryId, status: "OPEN" })),
        setDoc(doc(db, "recurringTransactions", "e2e-recurring"), { ...common, amountInCents: 5_000, type: "EXPENSE", targetType: "ACCOUNT", frequency: "MONTHLY", status: "ACTIVE", categoryId: expenseCategoryId, accountId: principalId, cardId: null, description: "Recorrencia E2E", startDate: timestamp, nextOccurrenceDate: Timestamp.fromDate(nextMonth), endDate: null }),
        setDoc(doc(db, "budgets", "e2e-budget"), { ...common, name: "Orcamento E2E", categoryId: expenseCategoryId, limitInCents: 50_000, startDate: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)), status: "ACTIVE" }),
        setDoc(doc(db, "goals", "e2e-goal"), { ...common, name: "Meta E2E", targetAmountInCents: 100_000, currentAmountInCents: 20_000, category: "Reserva", icon: "Target", status: "ACTIVE", deadline: Timestamp.fromDate(nextMonth) }),
      ]);
    });
  } finally {
    await testEnvironment.cleanup();
  }
}
