import type { FinancialGoal, GoalProgress, GoalStatus } from "../types/goal";

export function calculateGoalProgress(goal: FinancialGoal): GoalProgress {
  const currentAmountInCents = Math.max(0, goal.currentAmountInCents);
  const progressPercent = goal.targetAmountInCents > 0
    ? Math.min(100, Math.round((currentAmountInCents / goal.targetAmountInCents) * 100))
    : 0;
  return {
    ...goal,
    currentAmountInCents,
    progressPercent,
    remainingInCents: Math.max(0, goal.targetAmountInCents - currentAmountInCents),
    status: resolveGoalStatus(goal.status, currentAmountInCents, goal.targetAmountInCents),
  };
}

export function resolveGoalStatus(status: GoalStatus, currentAmountInCents: number, targetAmountInCents: number): GoalStatus {
  if (status === "ARCHIVED") return status;
  return currentAmountInCents >= targetAmountInCents ? "COMPLETED" : "ACTIVE";
}

export function applyGoalAmount(currentAmountInCents: number, deltaInCents: number) {
  if (!Number.isInteger(deltaInCents)) throw new Error("O valor precisa estar em centavos inteiros.");
  return Math.max(0, currentAmountInCents + deltaInCents);
}
