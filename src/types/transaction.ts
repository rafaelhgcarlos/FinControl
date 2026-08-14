import type { UserScopedEntity } from "./common";

export type TransactionType = "income" | "expense" | "transfer" | "credit_card_purchase" | "invoice_payment";

export type Transaction = UserScopedEntity & {
  description: string;
  amountInCents: number;
  date: Date;
  type: TransactionType;
  accountId?: string;
  destinationAccountId?: string;
  creditCardId?: string;
  invoiceId?: string;
  recurrenceKey?: string;
  installmentKey?: string;
};
