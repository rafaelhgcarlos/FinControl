import { describe, expect, it } from "vitest";
import { calculateAccountBalanceAfterTransaction } from "./transactions";

describe("calculateAccountBalanceAfterTransaction", () => {
  it("soma receitas ao saldo", () => {
    expect(calculateAccountBalanceAfterTransaction(10_000, 2_500, "income")).toBe(12_500);
  });

  it("subtrai despesas e pagamentos de fatura do saldo", () => {
    expect(calculateAccountBalanceAfterTransaction(10_000, 2_500, "expense")).toBe(7_500);
    expect(calculateAccountBalanceAfterTransaction(10_000, 2_500, "invoice_payment")).toBe(7_500);
  });

  it("nao altera saldo direto em transferencias e compras no cartao", () => {
    expect(calculateAccountBalanceAfterTransaction(10_000, 2_500, "transfer")).toBe(10_000);
    expect(calculateAccountBalanceAfterTransaction(10_000, 2_500, "credit_card_purchase")).toBe(10_000);
  });
});
