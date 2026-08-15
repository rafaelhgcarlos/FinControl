import { describe, expect, it } from "vitest";
import { calculateAccountBalanceAfterTransaction } from "./transactions";
import { balanceDeltas, mergeBalanceDeltas, reverseBalanceDeltas, type TransactionInput } from "../services/transactionsService";

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

describe("transaction balance deltas", () => {
  it("aplica receitas, despesas e transferencias nas contas corretas", () => {
    expect(balanceDeltas(input("INCOME", 2_000, "checking"))).toEqual([
      { accountId: "checking", deltaInCents: 2_000 },
    ]);
    expect(balanceDeltas(input("EXPENSE", 1_500, "checking"))).toEqual([
      { accountId: "checking", deltaInCents: -1_500 },
    ]);
    expect(balanceDeltas(input("TRANSFER", 3_000, "checking", "savings"))).toEqual([
      { accountId: "checking", deltaInCents: -3_000 },
      { accountId: "savings", deltaInCents: 3_000 },
    ]);
  });

  it("edicao reverte o impacto anterior antes de aplicar o novo", () => {
    const previous = input("EXPENSE", 2_000, "checking");
    const next = input("EXPENSE", 3_500, "savings");

    expect(mergeBalanceDeltas([...reverseBalanceDeltas(previous), ...balanceDeltas(next)])).toEqual([
      { accountId: "checking", deltaInCents: 2_000 },
      { accountId: "savings", deltaInCents: -3_500 },
    ]);
  });

  it("exclusao restaura os saldos afetados", () => {
    expect(reverseBalanceDeltas(input("TRANSFER", 4_500, "checking", "savings"))).toEqual([
      { accountId: "checking", deltaInCents: 4_500 },
      { accountId: "savings", deltaInCents: -4_500 },
    ]);
  });
});

function input(type: TransactionInput["type"], amountInCents: number, accountId: string, destinationAccountId?: string): TransactionInput {
  return {
    amountInCents,
    type,
    accountId,
    destinationAccountId,
    categoryId: type === "TRANSFER" ? undefined : "category-1",
    date: new Date("2026-08-01T12:00:00"),
  };
}
