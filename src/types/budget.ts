import type { UserScopedEntity } from "./common";

export type BudgetStatus = "ACTIVE" | "ARCHIVED";

export type Budget = UserScopedEntity & {
  name: string;
  categoryId: string;
  limitInCents: number;
  startDate: Date;
  endDate: Date;
  status: BudgetStatus;
};

export type BudgetWithUsage = Budget & {
  spentInCents: number;
  remainingInCents: number;
  percentage: number;
};
