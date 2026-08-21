export type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
export type OnboardingStep = 1 | 2 | 3 | 4;

export type UserProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  locale: "pt-BR";
  currency: "BRL";
  timeZone: "America/Sao_Paulo";
  onboardingStatus: OnboardingStatus;
  onboardingStep: OnboardingStep;
  onboardingCompletedAt: Date | null;
  onboardingVersion: number;
};

export type UserProfileUpdate = Partial<Pick<UserProfile, "displayName" | "onboardingStatus" | "onboardingStep" | "onboardingCompletedAt" | "onboardingVersion">>;
