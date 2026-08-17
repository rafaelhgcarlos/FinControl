import { collection, deleteDoc, doc, getDocs, getDoc, limit, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, type User } from "firebase/auth";
import { firebaseAuth, firestore } from "../firebase/config";
import { collections, privateUserCollections } from "../firebase/collections";
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
