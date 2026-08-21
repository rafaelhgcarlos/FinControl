import { collection, deleteDoc, doc, getDocs, getDoc, limit, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, type User } from "firebase/auth";
import { firebaseAuth, firestore } from "../firebase/config";
import { collections, privateUserCollections } from "../firebase/collections";
import type { OnboardingStatus, OnboardingStep, UserProfile, UserProfileUpdate } from "../types/user";

export const currentOnboardingVersion = 1;

const defaultPreferences = {
  locale: "pt-BR" as const,
  currency: "BRL" as const,
  timeZone: "America/Sao_Paulo" as const,
  onboardingStatus: "NOT_STARTED" as const,
  onboardingStep: 1 as const,
  onboardingCompletedAt: null,
  onboardingVersion: currentOnboardingVersion,
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(firestore, collections.users, userId));
  return snapshot.exists() ? normalizeUserProfile(snapshot.data()) : null;
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const profile: UserProfile = {
    id: user.uid,
    email: user.email,
    displayName: user.displayName,
    ...defaultPreferences,
  };
  await setDoc(doc(firestore, collections.users, user.uid), profile, { merge: true });
  return profile;
}

export function normalizeUserProfile(profile: Partial<UserProfile> & Record<string, unknown>): UserProfile {
  const hasOnboardingState = typeof profile.onboardingStatus === "string";
  return {
    id: profile.id ?? "",
    email: profile.email ?? null,
    displayName: profile.displayName ?? null,
    locale: "pt-BR",
    currency: "BRL",
    timeZone: "America/Sao_Paulo",
    onboardingStatus: normalizeOnboardingStatus(profile.onboardingStatus, hasOnboardingState),
    onboardingStep: normalizeOnboardingStep(profile.onboardingStep),
    onboardingCompletedAt: normalizeOptionalDate(profile.onboardingCompletedAt),
    onboardingVersion: typeof profile.onboardingVersion === "number" ? profile.onboardingVersion : currentOnboardingVersion,
  };
}

export async function updateUserProfile(userId: string, changes: UserProfileUpdate) {
  await updateDoc(doc(firestore, collections.users, userId), changes);
}

export function updateOnboardingState(userId: string, status: OnboardingStatus, step: OnboardingStep, completedAt: Date | null = null) {
  return updateUserProfile(userId, {
    onboardingStatus: status,
    onboardingStep: step,
    onboardingCompletedAt: completedAt,
    onboardingVersion: currentOnboardingVersion,
  });
}

export function isOnboardingEligible(profile: UserProfile | null) {
  return Boolean(profile && profile.onboardingVersion === currentOnboardingVersion && (profile.onboardingStatus === "NOT_STARTED" || profile.onboardingStatus === "IN_PROGRESS"));
}

function normalizeOnboardingStatus(value: unknown, hasState: boolean): OnboardingStatus {
  if (value === "NOT_STARTED" || value === "IN_PROGRESS" || value === "COMPLETED" || value === "SKIPPED") return value;
  return hasState ? "NOT_STARTED" : "SKIPPED";
}

function normalizeOnboardingStep(value: unknown): OnboardingStep {
  return value === 2 || value === 3 || value === 4 ? value : 1;
}

function normalizeOptionalDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate();
  return null;
}

export type AccountDeletionProgress = { collectionName: string; deletedDocuments: number; completedCollections: number; totalCollections: number };

export async function deleteUserAccount(password: string, onProgress?: (progress: AccountDeletionProgress) => void) {
  const user = firebaseAuth.currentUser;
  if (!user?.email) throw new Error("Entre novamente antes de excluir sua conta.");
  if (!password) throw new Error("Informe sua senha atual para confirmar a exclusao.");

  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  let deletedDocuments = 0;
  try {
    await runBatchedAccountDeletion(
      [...privateUserCollections],
      async (collectionName, pageSize) => {
        const snapshot = await getDocs(query(collection(firestore, collectionName), where("userId", "==", user.uid), limit(pageSize)));
        return snapshot.docs;
      },
      async (documents) => {
        const batch = writeBatch(firestore);
        documents.forEach((item) => batch.delete(item.ref));
        await batch.commit();
      },
      (progress) => {
        deletedDocuments = progress.deletedDocuments;
        onProgress?.(progress);
      },
    );
    const adminRef = doc(firestore, collections.admins, user.uid);
    if ((await getDoc(adminRef)).exists()) await deleteDoc(adminRef);
    await deleteDoc(doc(firestore, collections.users, user.uid));
  } catch {
    throw new Error(`A exclusao foi interrompida apos remover ${deletedDocuments} documento(s). Tente novamente para concluir.`);
  }
  await deleteUser(user);
}

export async function runBatchedAccountDeletion<T>(
  collectionNames: string[],
  fetchPage: (collectionName: string, pageSize: number) => Promise<T[]>,
  commitPage: (documents: T[]) => Promise<void>,
  onProgress?: (progress: AccountDeletionProgress) => void,
  pageSize = 450,
) {
  let deletedDocuments = 0;
  for (let index = 0; index < collectionNames.length; index += 1) {
    const collectionName = collectionNames[index];
    while (true) {
      const documents = await fetchPage(collectionName, pageSize);
      if (documents.length === 0) break;
      await commitPage(documents);
      deletedDocuments += documents.length;
      onProgress?.({ collectionName, deletedDocuments, completedCollections: index, totalCollections: collectionNames.length });
      if (documents.length < pageSize) break;
    }
    onProgress?.({ collectionName, deletedDocuments, completedCollections: index + 1, totalCollections: collectionNames.length });
  }
  return deletedDocuments;
}
