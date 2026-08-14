import { applyTransactionToBalance } from "../utils/money";

export type BalanceImpactType = "income" | "expense" | "transfer" | "credit_card_purchase" | "invoice_payment";

export function calculateAccountBalanceAfterTransaction(
  currentBalanceInCents: number,
  amountInCents: number,
  type: BalanceImpactType,
) {
  if (type === "income") {
    return applyTransactionToBalance(currentBalanceInCents, amountInCents, "income");
  }

  if (type === "expense" || type === "invoice_payment") {
    return applyTransactionToBalance(currentBalanceInCents, amountInCents, "expense");
  }

  return currentBalanceInCents;
}
