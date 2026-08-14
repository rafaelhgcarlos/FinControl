import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { firestore } from "../firebase/config";
import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { CardInvoice, CardPurchase, CreditCard } from "../types/creditCard";
import type { Transaction } from "../types/transaction";
import { listAccounts } from "./accountsService";
import { listCards, listInvoices, listPurchases } from "./cardsService";
import { listCategories } from "./categoriesService";
import { listTransactionsPage } from "./transactionsService";
import { endOfDay, endOfMonth, endOfWeek, endOfYear, monthShortLabel, startOfDay, startOfMonth, startOfWeek, startOfYear } from "../utils/date";

export type PeriodPreset = "today" | "week" | "month" | "year" | "custom";

export type DashboardPeriod = {
  preset: PeriodPreset;
  startDate: Date;
  endDate: Date;
};

export type ChartPoint = {
  label: string;
  incomeInCents: number;
  expenseInCents: number;
  balanceInCents: number;
};

export type CategorySpending = {
  categoryId: string;
  name: string;
  color: string;
  amountInCents: number;
};

export type FinancialAnalytics = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  totalBalanceInCents: number;
  incomeInCents: number;
  expenseInCents: number;
  resultInCents: number;
  averageExpenseInCents: number;
  largestExpense: Transaction | null;
  topExpenseCategory: CategorySpending | null;
  savingsRate: number | null;
  incomeCommitmentRate: number | null;
  categorySpending: CategorySpending[];
  upcomingInvoices: UpcomingInvoice[];
  upcomingInvoicesTotalInCents: number;
  timeSeries: ChartPoint[];
  monthlyEvolution: ChartPoint[];
  upcomingExpenses: Transaction[];
  alerts: string[];
  goalProgress: GoalProgress[];
};

export type UpcomingInvoice = {
  id: string;
  cardId: string;
  cardName: string;
  amountInCents: number;
  dueDate: Date;
  daysUntilDue: number;
  status: CardInvoice["status"];
};

type BudgetSnapshot = {
  userId: string;
  categoryId?: string;
  name?: string;
  limitInCents?: number;
  spentInCents?: number;
  status?: string;
};

export type GoalProgress = {
  id: string;
  name: string;
  targetAmountInCents: number;
  currentAmountInCents: number;
  progressPercent: number;
};

type GoalSnapshot = {
  userId: string;
  name?: string;
  targetAmountInCents?: number;
  currentAmountInCents?: number;
  status?: string;
};

export function getDefaultDashboardPeriod(): DashboardPeriod {
  return resolvePeriod("month");
}

export function resolvePeriod(preset: PeriodPreset, customStart?: Date, customEnd?: Date): DashboardPeriod {
  const now = new Date();
  if (preset === "today") return { preset, startDate: startOfDay(now), endDate: endOfDay(now) };
  if (preset === "week") return { preset, startDate: startOfWeek(now), endDate: endOfWeek(now) };
  if (preset === "year") return { preset, startDate: startOfYear(now), endDate: endOfYear(now) };
  if (preset === "custom") {
    return {
      preset,
      startDate: customStart ? startOfDay(customStart) : startOfMonth(now),
      endDate: customEnd ? endOfDay(customEnd) : endOfMonth(now),
    };
  }
  return { preset: "month", startDate: startOfMonth(now), endDate: endOfMonth(now) };
}

export async function getFinancialAnalytics(userId: string, period: DashboardPeriod): Promise<FinancialAnalytics> {
  const [accounts, categories, periodPage, yearPage, budgets, goals, cards, invoices, cardPurchases] = await Promise.all([
    listAccounts(userId),
    listCategories(userId),
    listTransactionsPage(userId, { type: "ALL", startDate: period.startDate, endDate: period.endDate }, 500),
    listTransactionsPage(userId, { type: "ALL", startDate: startOfYear(period.endDate), endDate: endOfYear(period.endDate) }, 1000),
    listBudgetSnapshots(userId),
    listGoalSnapshots(userId),
    listCards(userId),
    listInvoices(userId),
    listPurchases(userId),
  ]);

  const transactions = periodPage.items;
  const activeAccounts = accounts.filter((account) => account.status === "ACTIVE");
  const incomeInCents = sumTransactions(transactions, "INCOME");
  const expenseTransactions = transactions.filter((transaction) => transaction.type === "EXPENSE");
  const periodCardPurchases = cardPurchases.filter((purchase) => purchase.purchaseDate >= period.startDate && purchase.purchaseDate <= period.endDate);
  const cardExpenseInCents = periodCardPurchases.reduce((total, purchase) => total + purchase.amountInCents, 0);
  const expenseInCents = expenseTransactions.reduce((total, transaction) => total + transaction.amountInCents, 0) + cardExpenseInCents;
  const resultInCents = incomeInCents - expenseInCents;
  const categorySpending = buildCategorySpending(expenseTransactions, categories, periodCardPurchases);
  const topExpenseCategory = categorySpending[0] ?? null;

  return {
    accounts,
    categories,
    transactions,
    totalBalanceInCents: activeAccounts.reduce((total, account) => total + account.currentBalanceInCents, 0),
    incomeInCents,
    expenseInCents,
    resultInCents,
    averageExpenseInCents: expenseTransactions.length ? Math.round(expenseInCents / expenseTransactions.length) : 0,
    largestExpense: expenseTransactions.reduce<Transaction | null>((largest, transaction) => !largest || transaction.amountInCents > largest.amountInCents ? transaction : largest, null),
    topExpenseCategory,
    savingsRate: incomeInCents > 0 ? (resultInCents / incomeInCents) * 100 : null,
    incomeCommitmentRate: incomeInCents > 0 ? (expenseInCents / incomeInCents) * 100 : null,
    categorySpending,
    upcomingInvoices: buildUpcomingInvoices(invoices, cards),
    upcomingInvoicesTotalInCents: buildUpcomingInvoices(invoices, cards).reduce((total, invoice) => total + invoice.amountInCents, 0),
    timeSeries: buildTimeSeries(transactions, period),
    monthlyEvolution: buildMonthlyEvolution(yearPage.items),
    upcomingExpenses: transactions
      .filter((transaction) => transaction.type === "EXPENSE" && transaction.date >= startOfDay(new Date()))
      .sort((left, right) => left.date.getTime() - right.date.getTime())
      .slice(0, 5),
    alerts: buildAlerts(activeAccounts, incomeInCents, expenseInCents, resultInCents, categorySpending, budgets),
    goalProgress: buildGoalProgress(goals),
  };
}

async function listBudgetSnapshots(userId: string) {
  const snapshot = await getDocs(query(collection(firestore, "budgets"), where("userId", "==", userId), limit(50)));
  return snapshot.docs.map((item) => item.data() as BudgetSnapshot);
}

async function listGoalSnapshots(userId: string) {
  const snapshot = await getDocs(query(collection(firestore, "goals"), where("userId", "==", userId), limit(50)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as GoalSnapshot) }));
}

function sumTransactions(transactions: Transaction[], type: "INCOME" | "EXPENSE") {
  return transactions.filter((transaction) => transaction.type === type).reduce((total, transaction) => total + transaction.amountInCents, 0);
}

function buildCategorySpending(expenses: Transaction[], categories: Category[], cardPurchases: CardPurchase[] = []) {
  const byCategory = new Map<string, CategorySpending>();
  for (const transaction of expenses) {
    const categoryId = transaction.categoryId ?? "uncategorized";
    const category = categories.find((item) => item.id === categoryId);
    const existing = byCategory.get(categoryId);
    byCategory.set(categoryId, {
      categoryId,
      name: category?.name ?? "Sem categoria",
      color: category?.color ?? "#64748b",
      amountInCents: (existing?.amountInCents ?? 0) + transaction.amountInCents,
    });
  }
  for (const purchase of cardPurchases) {
    const categoryId = purchase.categoryId ?? "uncategorized";
    const category = categories.find((item) => item.id === categoryId);
    const existing = byCategory.get(categoryId);
    byCategory.set(categoryId, {
      categoryId,
      name: category?.name ?? "Sem categoria",
      color: category?.color ?? "#64748b",
      amountInCents: (existing?.amountInCents ?? 0) + purchase.amountInCents,
    });
  }
  return Array.from(byCategory.values()).sort((left, right) => right.amountInCents - left.amountInCents);
}

function buildUpcomingInvoices(invoices: CardInvoice[], cards: CreditCard[]) {
  const today = startOfDay(new Date());
  return invoices
    .filter((invoice) => invoice.status !== "PAID" && invoice.totalInCents > invoice.paidInCents)
    .map((invoice) => {
      const card = cards.find((item) => item.id === invoice.cardId);
      return {
        id: invoice.id,
        cardId: invoice.cardId,
        cardName: card?.name ?? "Cartao",
        amountInCents: invoice.totalInCents - invoice.paidInCents,
        dueDate: invoice.dueDate,
        daysUntilDue: Math.ceil((startOfDay(invoice.dueDate).getTime() - today.getTime()) / 86400000),
        status: invoice.status,
      };
    })
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())
    .slice(0, 5);
}

function buildTimeSeries(transactions: Transaction[], period: DashboardPeriod) {
  const points = new Map<string, ChartPoint>();
  const useMonth = period.preset === "year";
  for (const transaction of transactions) {
    const key = useMonth
      ? `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, "0")}`
      : transaction.date.toISOString().slice(0, 10);
    const label = useMonth ? monthShortLabel(transaction.date) : transaction.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const point = points.get(key) ?? { label, incomeInCents: 0, expenseInCents: 0, balanceInCents: 0 };
    if (transaction.type === "INCOME") point.incomeInCents += transaction.amountInCents;
    if (transaction.type === "EXPENSE") point.expenseInCents += transaction.amountInCents;
    point.balanceInCents += transaction.type === "INCOME" ? transaction.amountInCents : transaction.type === "EXPENSE" ? -transaction.amountInCents : 0;
    points.set(key, point);
  }
  return Array.from(points.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([, point]) => point);
}

function buildMonthlyEvolution(transactions: Transaction[]) {
  const points = new Map<string, ChartPoint>();
  for (const transaction of transactions) {
    const key = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, "0")}`;
    const point = points.get(key) ?? { label: monthShortLabel(transaction.date), incomeInCents: 0, expenseInCents: 0, balanceInCents: 0 };
    if (transaction.type === "INCOME") point.incomeInCents += transaction.amountInCents;
    if (transaction.type === "EXPENSE") point.expenseInCents += transaction.amountInCents;
    point.balanceInCents += transaction.type === "INCOME" ? transaction.amountInCents : transaction.type === "EXPENSE" ? -transaction.amountInCents : 0;
    points.set(key, point);
  }
  return Array.from(points.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([, point]) => point);
}

function buildAlerts(accounts: Account[], incomeInCents: number, expenseInCents: number, resultInCents: number, categorySpending: CategorySpending[], budgets: BudgetSnapshot[]) {
  const alerts: string[] = [];
  if (accounts.length === 0) alerts.push("Cadastre uma conta para iniciar o acompanhamento.");
  if (accounts.some((account) => account.currentBalanceInCents < 0)) alerts.push("Existe conta ativa com saldo negativo.");
  if (incomeInCents === 0) alerts.push("Nenhuma receita registrada no periodo.");
  if (resultInCents < 0) alerts.push("Despesas acima das receitas no periodo selecionado.");
  if (incomeInCents > 0 && expenseInCents / incomeInCents >= 0.8) alerts.push("Comprometimento de renda acima de 80%.");
  if (categorySpending[0] && expenseInCents > 0 && categorySpending[0].amountInCents / expenseInCents >= 0.5) alerts.push(`Mais de 50% dos gastos estao em ${categorySpending[0].name}.`);
  budgets.forEach((budget) => {
    const budgetLimit = budget.limitInCents ?? 0;
    const spent = budget.spentInCents ?? categorySpending.find((item) => item.categoryId === budget.categoryId)?.amountInCents ?? 0;
    if (budgetLimit > 0 && spent / budgetLimit >= 0.9) alerts.push(`Orcamento ${budget.name ?? "do periodo"} acima de 90%.`);
  });
  return Array.from(new Set(alerts)).slice(0, 5);
}

function buildGoalProgress(goals: Array<GoalSnapshot & { id: string }>): GoalProgress[] {
  return goals
    .filter((goal) => goal.status !== "ARCHIVED" && (goal.targetAmountInCents ?? 0) > 0)
    .map((goal) => {
      const targetAmountInCents = goal.targetAmountInCents ?? 0;
      const currentAmountInCents = goal.currentAmountInCents ?? 0;
      return {
        id: goal.id,
        name: goal.name ?? "Meta",
        targetAmountInCents,
        currentAmountInCents,
        progressPercent: Math.min(100, Math.round((currentAmountInCents / targetAmountInCents) * 100)),
      };
    })
    .sort((left, right) => right.progressPercent - left.progressPercent)
    .slice(0, 5);
}
