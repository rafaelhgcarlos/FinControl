import { collection, deleteDoc, doc, getDocs, getDoc, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { deleteUser, type User } from "firebase/auth";
import { firebaseAuth, firestore } from "../firebase/config";
import { collections } from "../firebase/collections";
import type { UserProfile, UserProfileUpdate } from "../types/user";

const defaultPreferences = {
  locale: "pt-BR" as const,
  currency: "BRL" as const,
  timeZone: "America/Sao_Paulo" as const,
  financialMonthStartDay: 1,
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(firestore, collections.users, userId));
  return snapshot.exists() ? normalizeUserProfile(snapshot.data() as Partial<UserProfile>) : null;
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

function normalizeUserProfile(profile: Partial<UserProfile>): UserProfile {
  return {
    id: profile.id ?? "",
    email: profile.email ?? null,
    displayName: profile.displayName ?? null,
    locale: "pt-BR",
    currency: "BRL",
    timeZone: "America/Sao_Paulo",
    financialMonthStartDay: profile.financialMonthStartDay ?? 1,
  };
}

export async function updateUserProfile(userId: string, changes: UserProfileUpdate) {
  await updateDoc(doc(firestore, collections.users, userId), changes);
}

export async function deleteUserAccount() {
  const user = firebaseAuth.currentUser;
  if (!user) return;
  const privateCollections = [collections.accounts, collections.transactions, collections.monthlySummaries, collections.recurringTransactions, "cards", "budgets", "goals"];
  for (const collectionName of privateCollections) {
    const snapshot = await getDocs(query(collection(firestore, collectionName), where("userId", "==", user.uid)));
    if (snapshot.empty) continue;
    const batch = writeBatch(firestore);
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
  }
  await deleteDoc(doc(firestore, collections.users, user.uid));
  await deleteUser(user);
}
