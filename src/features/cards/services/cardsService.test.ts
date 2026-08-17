import { describe, expect, it } from "vitest";
import { buildInvoiceDates, resolveInvoiceCycleDate, splitPurchaseIntoInstallments } from "./cardsCalculations";

describe("splitPurchaseIntoInstallments", () => {
  it("mantem a soma das parcelas igual ao total da compra", () => {
    const installments = splitPurchaseIntoInstallments(10_000, 3);

    expect(installments).toEqual([3334, 3333, 3333]);
    expect(installments.reduce((total, amount) => total + amount, 0)).toBe(10_000);
  });
});

describe("card invoice date calculations", () => {
  it("move a compra para o ciclo seguinte quando passa do fechamento", () => {
    expect(resolveInvoiceCycleDate(new Date("2026-08-11T12:00:00"), 10).getMonth()).toBe(8);
  });

  it("calcula fechamento e vencimento com meses de tamanhos diferentes", () => {
    const dates = buildInvoiceDates(new Date("2026-02-01T12:00:00"), 31, 5);

    expect(dates.cycleKey).toBe("2026-02");
    expect(dates.closingDate.getDate()).toBe(28);
    expect(dates.dueDate.getMonth()).toBe(2);
    expect(dates.dueDate.getDate()).toBe(5);
  });
});
