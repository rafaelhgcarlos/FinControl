import { describe, expect, it } from "vitest";
import { FirebaseError } from "firebase/app";
import { isOptionalAnalyticsQueryUnavailable, resolvePeriod } from "./analyticsService";
import { endOfFinancialMonth, startOfFinancialMonth } from "../utils/date";

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

  it("respects custom financial month start day", () => {
    const start = startOfFinancialMonth(new Date("2026-08-05T15:00:00"), 10);
    const end = endOfFinancialMonth(new Date("2026-08-05T15:00:00"), 10);

    expect(start.toISOString().slice(0, 10)).toBe("2026-07-10");
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(7);
    expect(end.getDate()).toBe(9);
  });

  it("keeps financial periods stable around Sao Paulo timezone dates", () => {
    const period = resolvePeriod("month", undefined, undefined, 15);

    expect(period.startDate.getDate()).toBe(15);
  });

  it("falls back while optional analytics indexes are unavailable", () => {
    expect(isOptionalAnalyticsQueryUnavailable(new FirebaseError("firestore/failed-precondition", "Index is building"))).toBe(true);
    expect(isOptionalAnalyticsQueryUnavailable(new FirebaseError("firestore/permission-denied", "Rules not deployed"))).toBe(true);
    expect(isOptionalAnalyticsQueryUnavailable(new FirebaseError("firestore/unavailable", "Offline"))).toBe(false);
  });
});
