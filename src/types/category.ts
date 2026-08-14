import type { UserScopedEntity } from "./common";

export type CategoryType = "INCOME" | "EXPENSE";

export type Category = UserScopedEntity & {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  status: "ACTIVE" | "ARCHIVED";
  isDefault: boolean;
};
