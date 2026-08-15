import { describe, expect, it } from "vitest";
import { buildFinancialAlerts } from "./alerts";

describe("buildFinancialAlerts", () => {
  it("deduplica e classifica alertas financeiros internos", () => {
    const alerts = buildFinancialAlerts({
      accounts: [{
        id: "account-1",
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Conta principal",
        type: "CHECKING",
        initialBalanceInCents: 0,
        currentBalanceInCents: -100,
        color: "#000",
        icon: "Landmark",
        status: "ACTIVE",
      }],
      budgets: [{ id: "budget-1", name: "Mercado", limitInCents: 10000, spentInCents: 10500 }],
      categorySpending: [],
      expenseInCents: 9000,
      incomeInCents: 10000,
      invoices: [{ id: "invoice-1", dueDate: new Date("2026-08-16T12:00:00"), paidInCents: 0, totalInCents: 5000, status: "OPEN", cardName: "Visa" }],
      recurrences: [],
      goals: [],
      largestExpense: null,
      today: new Date("2026-08-15T12:00:00"),
    });

    expect(alerts.map((alert) => alert.type)).toEqual(["budget", "invoice", "low_balance", "cashflow"]);
    expect(alerts.some((alert) => alert.severity === "danger")).toBe(true);
  });
});
