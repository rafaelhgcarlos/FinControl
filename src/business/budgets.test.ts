import { describe, expect, it } from "vitest";
import type { Budget } from "../types/budget";
import type { CardPurchase } from "../types/creditCard";
import type { Transaction } from "../types/transaction";
import { calculateBudgetUsage, getBudgetAlertLevel } from "./budgets";

describe("budget calculations", () => {
  it("soma despesas em conta e compras no cartao sem contar transferencias", () => {
    const result = calculateBudgetUsage(budget(), [transaction("expense", "EXPENSE", 3_000), transaction("transfer", "TRANSFER", 9_000)], [purchase(2_000)]);
    expect(result.spentInCents).toBe(5_000);
    expect(result.remainingInCents).toBe(5_000);
    expect(result.percentage).toBe(50);
  });

  it("ignora categorias e datas fora do orcamento", () => {
    const outside = transaction("outside", "EXPENSE", 5_000); outside.date = new Date("2026-09-01T12:00:00-03:00");
    const otherCategory = transaction("other", "EXPENSE", 5_000); otherCategory.categoryId = "other";
    expect(calculateBudgetUsage(budget(), [outside, otherCategory], []).spentInCents).toBe(0);
  });

  it("classifica os alertas nos limites de 50, 80 e 100 por cento", () => {
    expect([49, 50, 80, 100].map(getBudgetAlertLevel)).toEqual(["BELOW_50", "AT_50", "AT_80", "AT_100"]);
  });
});

function budget(): Budget { return { id: "b", userId: "u", createdAt: new Date(), updatedAt: new Date(), name: "Mercado", categoryId: "food", limitInCents: 10_000, startDate: new Date("2026-08-01T00:00:00-03:00"), endDate: new Date("2026-08-31T23:59:59-03:00"), status: "ACTIVE" }; }
function transaction(id: string, type: Transaction["type"], amountInCents: number): Transaction { return { id, userId: "u", createdAt: new Date(), updatedAt: new Date(), amountInCents, type, categoryId: "food", accountId: "a", date: new Date("2026-08-15T12:00:00-03:00") }; }
function purchase(amountInCents: number): CardPurchase { return { id: "p", userId: "u", createdAt: new Date(), updatedAt: new Date(), cardId: "c", categoryId: "food", description: "Compra", amountInCents, purchaseDate: new Date("2026-08-20T12:00:00-03:00"), installmentsCount: 1, firstInstallmentDate: new Date(), idempotencyKey: "p" }; }
