import type { UserScopedEntity } from "./common";

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

export type Transaction = UserScopedEntity & {
  amountInCents: number;
  type: TransactionType;
  categoryId?: string;
  accountId: string;
  destinationAccountId?: string;
  date: Date;
  description?: string;
};

export type TransactionFilters = {
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType | "ALL";
  categoryId?: string;
  accountId?: string;
  minAmountInCents?: number;
  maxAmountInCents?: number;
  search?: string;
};
