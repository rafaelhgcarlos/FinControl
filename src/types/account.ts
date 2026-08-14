import type { UserScopedEntity } from "./common";

export type Account = UserScopedEntity & {
  name: string;
  balanceInCents: number;
  archived: boolean;
};
