import type { Budget, BudgetWithUsage } from "../types/budget";
import type { CardPurchase } from "../types/creditCard";
import type { Transaction } from "../types/transaction";

export type BudgetAlertLevel = "BELOW_50" | "AT_50" | "AT_80" | "AT_100";

export function calculateBudgetUsage(budget: Budget, transactions: Transaction[], purchases: CardPurchase[]): BudgetWithUsage {
  const transactionTotal = transactions
    .filter((item) => item.type === "EXPENSE" && item.categoryId === budget.categoryId && inPeriod(item.date, budget))
    .reduce((total, item) => total + item.amountInCents, 0);
  const purchaseTotal = purchases
    .filter((item) => item.categoryId === budget.categoryId && inPeriod(item.purchaseDate, budget))
    .reduce((total, item) => total + item.amountInCents, 0);
  const spentInCents = transactionTotal + purchaseTotal;
  const percentage = budget.limitInCents > 0 ? Math.round((spentInCents / budget.limitInCents) * 100) : 0;
  return { ...budget, spentInCents, remainingInCents: budget.limitInCents - spentInCents, percentage };
}

export function getBudgetAlertLevel(percentage: number): BudgetAlertLevel {
  if (percentage >= 100) return "AT_100";
  if (percentage >= 80) return "AT_80";
  if (percentage >= 50) return "AT_50";
  return "BELOW_50";
}

function inPeriod(date: Date, budget: Pick<Budget, "startDate" | "endDate">) {
  return date >= budget.startDate && date <= budget.endDate;
}
