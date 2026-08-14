export type UserProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  locale: "pt-BR";
  currency: "BRL";
  timeZone: "America/Sao_Paulo";
};

export type UserProfileUpdate = Partial<Pick<UserProfile, "displayName" | "currency" | "timeZone">>;
