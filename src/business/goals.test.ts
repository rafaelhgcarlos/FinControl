import { describe, expect, it } from "vitest";
import type { FinancialGoal } from "../types/goal";
import { applyGoalAmount, calculateGoalProgress } from "./goals";

describe("goal calculations", () => {
  it("limita o progresso e conclui ao alcancar o objetivo", () => {
    expect(calculateGoalProgress(goal(10_000)).progressPercent).toBe(100);
    expect(calculateGoalProgress(goal(12_000)).status).toBe("COMPLETED");
  });
  it("mantem valores inteiros e nunca retira abaixo de zero", () => {
    expect(applyGoalAmount(1_000, 500)).toBe(1_500);
    expect(applyGoalAmount(1_000, -2_000)).toBe(0);
    expect(() => applyGoalAmount(1_000, 0.5)).toThrow();
  });
});
function goal(currentAmountInCents: number): FinancialGoal { return { id: "g", userId: "u", createdAt: new Date(), updatedAt: new Date(), name: "Reserva", targetAmountInCents: 10_000, currentAmountInCents, icon: "Target", status: "ACTIVE" }; }
