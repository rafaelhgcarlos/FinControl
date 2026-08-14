export type EntityId = string;

export type UserScopedEntity = {
  id: EntityId;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};
