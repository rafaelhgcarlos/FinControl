import { describe, expect, it } from "vitest";
import { splitPurchaseIntoInstallments } from "./cardsService";

describe("splitPurchaseIntoInstallments", () => {
  it("mantem a soma das parcelas igual ao total da compra", () => {
    const installments = splitPurchaseIntoInstallments(10_000, 3);

    expect(installments).toEqual([3334, 3333, 3333]);
    expect(installments.reduce((total, amount) => total + amount, 0)).toBe(10_000);
  });
});
