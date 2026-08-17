import { describe, expect, it } from "vitest";
import type { RecurringTransaction } from "../types/recurringTransaction";
import { advanceRecurringDate, buildRecurringOccurrenceId, resolveDueOccurrences, toSaoPauloDateKey } from "./recurringTransactionsService";

describe("recurring transaction scheduling", () => {
  it("gera ocorrencias semanais devidas de forma limitada", () => {
    const recurrence = recurring({ nextOccurrenceDate: new Date("2026-08-01T12:00:00-03:00"), frequency: "WEEKLY" });

    expect(resolveDueOccurrences(recurrence, new Date("2026-08-20T12:00:00-03:00"), 2).map(toSaoPauloDateKey)).toEqual([
      "2026-08-01",
      "2026-08-08",
    ]);
  });

  it("ignora recorrencias pausadas ou canceladas", () => {
    expect(resolveDueOccurrences(recurring({ status: "PAUSED" }), new Date("2026-08-20T12:00:00-03:00"), 10)).toEqual([]);
    expect(resolveDueOccurrences(recurring({ status: "CANCELED" }), new Date("2026-08-20T12:00:00-03:00"), 10)).toEqual([]);
  });

  it("usa chave idempotente por recorrencia e data em Sao Paulo", () => {
    expect(buildRecurringOccurrenceId("rent", new Date("2026-08-15T03:00:00.000Z"))).toBe("recurring_rent_2026-08-15");
  });

  it("avanca frequencias mensais e anuais preservando o dia possivel", () => {
    expect(toSaoPauloDateKey(advanceRecurringDate(new Date("2026-08-15T12:00:00-03:00"), "MONTHLY"))).toBe("2026-09-15");
    expect(toSaoPauloDateKey(advanceRecurringDate(new Date("2026-08-15T12:00:00-03:00"), "YEARLY"))).toBe("2027-08-15");
  });

  it("ajusta recorrencias no fim do mes sem pular fevereiro", () => {
    expect(toSaoPauloDateKey(advanceRecurringDate(new Date("2027-01-31T12:00:00-03:00"), "MONTHLY", 31))).toBe("2027-02-28");
    expect(toSaoPauloDateKey(advanceRecurringDate(new Date("2027-02-28T12:00:00-03:00"), "MONTHLY", 31))).toBe("2027-03-31");
  });
});

function recurring(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: "recurrence-1",
    userId: "user-1",
    createdAt: new Date("2026-08-01T12:00:00-03:00"),
    updatedAt: new Date("2026-08-01T12:00:00-03:00"),
    amountInCents: 1000,
    type: "EXPENSE",
    targetType: "ACCOUNT",
    frequency: "MONTHLY",
    status: "ACTIVE",
    categoryId: "category-1",
    accountId: "account-1",
    description: "Aluguel",
    startDate: new Date("2026-08-01T12:00:00-03:00"),
    nextOccurrenceDate: new Date("2026-08-01T12:00:00-03:00"),
    ...overrides,
  };
}
