import type { UserScopedEntity } from "./common";

export type GoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type FinancialGoal = UserScopedEntity & {
  name: string;
  targetAmountInCents: number;
  currentAmountInCents: number;
  deadline?: Date;
  category?: string;
  icon: string;
  status: GoalStatus;
};

export type GoalProgress = FinancialGoal & {
  progressPercent: number;
  remainingInCents: number;
};
