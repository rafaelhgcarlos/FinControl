import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./analyticsService";

describe("analytics period helpers", () => {
  it("keeps custom period boundaries normalized", () => {
    const period = resolvePeriod("custom", new Date("2026-08-10T15:00:00"), new Date("2026-08-14T08:00:00"));

    expect(period.startDate.getHours()).toBe(0);
    expect(period.startDate.getMinutes()).toBe(0);
    expect(period.endDate.getHours()).toBe(23);
    expect(period.endDate.getMinutes()).toBe(59);
  });

  it("does not divide savings by zero in callers", () => {
    const incomeInCents = 0;
    const resultInCents = -1000;
    const savingsRate = incomeInCents > 0 ? (resultInCents / incomeInCents) * 100 : null;

    expect(savingsRate).toBeNull();
  });
});
