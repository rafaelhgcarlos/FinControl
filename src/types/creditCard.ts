import type { UserScopedEntity } from "./common";

export type CreditCardStatus = "ACTIVE" | "ARCHIVED";
export type InvoiceStatus = "OPEN" | "CLOSED" | "PAID" | "OVERDUE";
export type CreditCardBrand = "VISA" | "MASTERCARD" | "ELO" | "AMEX" | "HIPERCARD" | "OTHER";

export type CreditCard = UserScopedEntity & {
  name: string;
  institution?: string;
  lastFour?: string;
  brand?: CreditCardBrand;
  limitInCents: number;
  committedLimitInCents: number;
  closingDay: number;
  dueDay: number;
  color: string;
  status: CreditCardStatus;
};

export type CardPurchase = UserScopedEntity & {
  cardId: string;
  categoryId?: string;
  description: string;
  amountInCents: number;
  purchaseDate: Date;
  installmentsCount: number;
  firstInstallmentDate: Date;
  idempotencyKey: string;
};

export type CardInstallment = UserScopedEntity & {
  purchaseId: string;
  cardId: string;
  categoryId?: string;
  invoiceId: string;
  installmentNumber: number;
  installmentsCount: number;
  amountInCents: number;
  dueDate: Date;
  description: string;
  status: "OPEN" | "PAID";
};

export type CardInvoice = UserScopedEntity & {
  cardId: string;
  cycleKey: string;
  totalInCents: number;
  paidInCents: number;
  closingDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
};

export type CardPayment = UserScopedEntity & {
  cardId: string;
  invoiceId: string;
  accountId: string;
  amountInCents: number;
  paidAt: Date;
};
