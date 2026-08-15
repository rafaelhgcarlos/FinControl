import { describe, expect, it } from "vitest";
import { monthlySummaryDelta, monthlySummaryId } from "./monthlySummariesService";

describe("monthly summary helpers", () => {
  it("gera id estavel por usuario e mes", () => {
    expect(monthlySummaryId("user-1", "2026-08")).toBe("user-1_2026-08");
  });

  it("calcula deltas de receita e despesa por categoria", () => {
    expect(monthlySummaryDelta({ amountInCents: 1000, date: new Date("2026-08-15T12:00:00"), type: "INCOME" })).toMatchObject({
      monthKey: "2026-08",
      incomeInCents: 1000,
      expenseInCents: 0,
      transactionCount: 1,
    });
    expect(monthlySummaryDelta({ amountInCents: 2500, categoryId: "food", date: new Date("2026-08-15T12:00:00"), type: "EXPENSE" }, -1)).toMatchObject({
      expenseInCents: -2500,
      categorySpending: { food: -2500 },
      transactionCount: -1,
    });
  });
});
