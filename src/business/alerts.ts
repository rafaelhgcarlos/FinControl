import type { Account } from "../types/account";
import type { CardInvoice } from "../types/creditCard";
import type { RecurringTransaction } from "../types/recurringTransaction";
import type { Transaction } from "../types/transaction";
import { startOfDay } from "../utils/date";
import type { CategorySpending } from "../services/analyticsService";

export type FinancialAlertSeverity = "info" | "warning" | "danger";
export type FinancialAlertType = "budget" | "invoice" | "recurrence" | "goal" | "low_balance" | "large_expense" | "cashflow";

export type FinancialAlert = {
  id: string;
  type: FinancialAlertType;
  severity: FinancialAlertSeverity;
  title: string;
  description: string;
};

export type AlertBudget = {
  id?: string;
  categoryId?: string;
  name?: string;
  limitInCents?: number;
  spentInCents?: number;
  status?: string;
};

export type AlertGoal = {
  id: string;
  name?: string;
  targetAmountInCents?: number;
  currentAmountInCents?: number;
  deadline?: Date;
  status?: string;
};

export function buildFinancialAlerts(input: {
  accounts: Account[];
  budgets: AlertBudget[];
  categorySpending: CategorySpending[];
  expenseInCents: number;
  incomeInCents: number;
  invoices: Array<Pick<CardInvoice, "id" | "dueDate" | "paidInCents" | "totalInCents" | "status"> & { cardName?: string }>;
  recurrences: RecurringTransaction[];
  goals: AlertGoal[];
  largestExpense: Transaction | null;
  today?: Date;
}) {
  const today = startOfDay(input.today ?? new Date());
  const alerts: FinancialAlert[] = [];

  input.budgets.filter((budget) => budget.status !== "ARCHIVED").forEach((budget) => {
    const limit = budget.limitInCents ?? 0;
    const spent = budget.spentInCents ?? input.categorySpending.find((item) => item.categoryId === budget.categoryId)?.amountInCents ?? 0;
    if (limit <= 0) return;
    const ratio = spent / limit;
    if (ratio >= 1) alerts.push(alert(`budget-${budget.id ?? budget.categoryId}`, "budget", "danger", "Orcamento ultrapassado", `${budget.name ?? "Orcamento"} passou de 100% do limite.`));
    else if (ratio >= 0.9) alerts.push(alert(`budget-${budget.id ?? budget.categoryId}`, "budget", "warning", "Orcamento perto do limite", `${budget.name ?? "Orcamento"} chegou a ${Math.round(ratio * 100)}% do limite.`));
  });

  input.invoices.forEach((invoice) => {
    if (invoice.status === "PAID" || invoice.totalInCents <= invoice.paidInCents) return;
    const days = daysBetween(today, invoice.dueDate);
    if (days < 0) alerts.push(alert(`invoice-${invoice.id}`, "invoice", "danger", "Fatura vencida", `${invoice.cardName ?? "Cartao"} venceu ha ${Math.abs(days)} dia(s).`));
    else if (days <= 5) alerts.push(alert(`invoice-${invoice.id}`, "invoice", "warning", "Fatura proxima", `${invoice.cardName ?? "Cartao"} vence em ${days} dia(s).`));
  });

  input.recurrences.forEach((recurrence) => {
    if (recurrence.status !== "ACTIVE") return;
    const days = daysBetween(today, recurrence.nextOccurrenceDate);
    if (days >= 0 && days <= 3) alerts.push(alert(`recurrence-${recurrence.id}`, "recurrence", "info", "Recorrencia proxima", `${recurrence.description} ocorre em ${days} dia(s).`));
  });

  input.goals.filter((goal) => goal.status !== "ARCHIVED" && goal.deadline).forEach((goal) => {
    const days = daysBetween(today, goal.deadline as Date);
    const progress = (goal.currentAmountInCents ?? 0) / Math.max(goal.targetAmountInCents ?? 0, 1);
    if (days >= 0 && days <= 15 && progress < 1) alerts.push(alert(`goal-${goal.id}`, "goal", "warning", "Meta perto do prazo", `${goal.name ?? "Meta"} vence em ${days} dia(s).`));
  });

  input.accounts.filter((account) => account.status === "ACTIVE" && account.currentBalanceInCents < 10_000).forEach((account) => {
    alerts.push(alert(`balance-${account.id}`, "low_balance", account.currentBalanceInCents < 0 ? "danger" : "warning", "Saldo baixo", `${account.name} esta com saldo reduzido.`));
  });

  if (input.incomeInCents > 0 && input.expenseInCents / input.incomeInCents >= 0.8) {
    alerts.push(alert("cashflow-commitment", "cashflow", "warning", "Renda comprometida", "Despesas consumiram pelo menos 80% das receitas."));
  }
  if (input.largestExpense && input.expenseInCents > 0 && input.largestExpense.amountInCents >= input.expenseInCents * 0.35) {
    alerts.push(alert("large-expense", "large_expense", "warning", "Despesa excepcional", `${input.largestExpense.description || "Uma despesa"} concentra parte relevante do periodo.`));
  }

  return Array.from(new Map(alerts.map((item) => [item.id, item])).values()).slice(0, 8);
}

function alert(id: string, type: FinancialAlertType, severity: FinancialAlertSeverity, title: string, description: string): FinancialAlert {
  return { id, type, severity, title, description };
}

function daysBetween(start: Date, end: Date) {
  return Math.ceil((startOfDay(end).getTime() - start.getTime()) / 86400000);
}
