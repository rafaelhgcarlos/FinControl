import type { CategoryType } from "./category";

export type AdminMembership = { active: boolean; createdAt?: Date };
export type GlobalCategoryStatus = "ACTIVE" | "BLOCKED";
export type GlobalCategory = {
  id: string; name: string; type: CategoryType; icon: string; color: string; status: GlobalCategoryStatus; createdAt: Date; updatedAt: Date;
};
export type AuditLog = { id: string; userId: string; action: string; entity: string; entityId: string; createdAt: Date };
export type AdminOverview = { registeredUsers: number | null; globalCategories: number; recentActions: number };
