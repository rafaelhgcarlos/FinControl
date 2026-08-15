import type { UserScopedEntity } from "./common";
import type { TransactionType } from "./transaction";

export type RecurringFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";
export type RecurringStatus = "ACTIVE" | "PAUSED" | "CANCELED";
export type RecurringTargetType = "ACCOUNT" | "CARD";
export type RecurringTransactionType = Exclude<TransactionType, "TRANSFER">;

export type RecurringTransaction = UserScopedEntity & {
  amountInCents: number;
  type: RecurringTransactionType;
  targetType: RecurringTargetType;
  frequency: RecurringFrequency;
  status: RecurringStatus;
  categoryId: string;
  accountId?: string;
  cardId?: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  nextOccurrenceDate: Date;
  lastProcessedDate?: Date;
};
