import type { UserScopedEntity } from "./common";

export type MonthlySummary = UserScopedEntity & {
  monthKey: string;
  incomeInCents: number;
  expenseInCents: number;
  transactionCount: number;
  categorySpending: Record<string, number>;
};
