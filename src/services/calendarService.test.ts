import { describe, expect, it } from "vitest";
import type { RecurringTransaction } from "../types/recurringTransaction";
import type { Transaction } from "../types/transaction";
import { buildCalendarEvents, groupCalendarEventsByDate, resolveRecurringOccurrencesInRange, saoPauloMonthRange } from "./calendarService";

describe("financial calendar", () => {
  it("agrupa eventos pela data de Sao Paulo", () => {
    const events = buildCalendarEvents([transaction()], [], [], [], new Date("2026-08-01T00:00:00-03:00"), new Date("2026-08-31T23:59:59-03:00"));
    expect(Object.keys(groupCalendarEventsByDate(events))).toEqual(["2026-08-15"]);
  });
  it("nao duplica recorrencia que ja gerou transacao", () => {
    const events = buildCalendarEvents([transaction()], [], [], [recurring()], new Date("2026-08-01T00:00:00-03:00"), new Date("2026-08-31T23:59:59-03:00"));
    expect(events.map((item) => item.kind)).toEqual(["TRANSACTION"]);
  });
  it("respeita limites visiveis e meses em Sao Paulo", () => {
    const range = saoPauloMonthRange(2026, 7);
    expect(resolveRecurringOccurrencesInRange(recurring(), range.startDate, range.endDate).map((date) => date.getDate())).toEqual([15]);
    expect(range.endDate.toISOString()).toBe("2026-09-01T02:59:59.999Z");
  });
});
function transaction(): Transaction { return { id: "t", userId: "u", createdAt: new Date(), updatedAt: new Date(), amountInCents: 1000, type: "EXPENSE", categoryId: "cat", accountId: "a", date: new Date("2026-08-15T12:00:00-03:00"), description: "Aluguel", recurringTransactionId: "r", occurrenceKey: "2026-08-15" }; }
function recurring(): RecurringTransaction { return { id: "r", userId: "u", createdAt: new Date(), updatedAt: new Date(), amountInCents: 1000, type: "EXPENSE", targetType: "ACCOUNT", frequency: "MONTHLY", status: "ACTIVE", categoryId: "cat", accountId: "a", description: "Aluguel", startDate: new Date("2026-08-15T12:00:00-03:00"), nextOccurrenceDate: new Date("2026-08-15T12:00:00-03:00") }; }
