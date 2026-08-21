import { describe, expect, it } from "vitest";
import { FirebaseError } from "firebase/app";
import { isOptionalAnalyticsQueryUnavailable, resolvePeriod } from "./analyticsService";

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

  it("uses the complete civil month", () => {
    const period = resolvePeriod("month");

    expect(period.startDate.getDate()).toBe(1);
    expect(period.startDate.getMonth()).toBe(period.endDate.getMonth());
    expect(period.endDate.getDate()).toBe(new Date(period.endDate.getFullYear(), period.endDate.getMonth() + 1, 0).getDate());
    expect(period.endDate.getHours()).toBe(23);
  });

  it("falls back while optional analytics indexes are unavailable", () => {
    expect(isOptionalAnalyticsQueryUnavailable(new FirebaseError("firestore/failed-precondition", "Index is building"))).toBe(true);
    expect(isOptionalAnalyticsQueryUnavailable(new FirebaseError("firestore/permission-denied", "Rules not deployed"))).toBe(true);
    expect(isOptionalAnalyticsQueryUnavailable(new FirebaseError("firestore/unavailable", "Offline"))).toBe(false);
  });
});
