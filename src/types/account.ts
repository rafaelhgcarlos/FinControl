import type { UserScopedEntity } from "./common";

export type AccountType = "CHECKING" | "SAVINGS" | "WALLET" | "DIGITAL" | "CASH" | "INVESTMENTS";
export type AccountStatus = "ACTIVE" | "ARCHIVED";

export type Account = UserScopedEntity & {
  name: string;
  type: AccountType;
  initialBalanceInCents: number;
  currentBalanceInCents: number;
  institution?: string;
  color: string;
  icon: string;
  status: AccountStatus;
};
