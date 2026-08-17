import { Timestamp, collection, doc, getDoc, getDocs, limit, orderBy, query, writeBatch } from "firebase/firestore";
import { collections } from "../firebase/collections";
import { firestore } from "../firebase/config";
import type { AdminMembership, AdminOverview, AuditLog, GlobalCategory, GlobalCategoryStatus } from "../types/admin";
import type { CategoryType } from "../types/category";
import { createConverter } from "./firestoreConverters";

const globalCategoryConverter = createConverter<GlobalCategory>();
const auditConverter = createConverter<AuditLog>();

export type GlobalCategoryInput = { name: string; type: CategoryType; icon: string; color: string };

export async function getAdminMembership(userId: string) {
  const snapshot = await getDoc(doc(firestore, collections.admins, userId));
  return snapshot.exists() && (snapshot.data() as AdminMembership).active === true;
}

export async function listGlobalCategories() {
  const snapshot = await getDocs(query(collection(firestore, collections.globalCategories).withConverter(globalCategoryConverter), orderBy("name", "asc"), limit(200)));
  return snapshot.docs.map((item) => item.data());
}

export async function createGlobalCategory(adminUserId: string, input: GlobalCategoryInput) {
  validateGlobalCategory(input); const now = Timestamp.now(); const ref = doc(collection(firestore, collections.globalCategories));
  const batch = writeBatch(firestore);
  batch.set(ref, { ...input, name: input.name.trim(), status: "ACTIVE", createdAt: now, updatedAt: now });
  batch.set(doc(collection(firestore, collections.auditLogs)), auditPayload(adminUserId, "CREATE", "globalCategory", ref.id, now));
  await batch.commit();
}

export async function updateGlobalCategory(adminUserId: string, categoryId: string, input: GlobalCategoryInput) {
  validateGlobalCategory(input);
  const now = Timestamp.now(); const batch = writeBatch(firestore);
  batch.update(doc(firestore, collections.globalCategories, categoryId), { ...input, name: input.name.trim(), updatedAt: now });
  batch.set(doc(collection(firestore, collections.auditLogs)), auditPayload(adminUserId, "UPDATE", "globalCategory", categoryId, now));
  await batch.commit();
}

export async function setGlobalCategoryStatus(adminUserId: string, categoryId: string, status: GlobalCategoryStatus) {
  const now = Timestamp.now(); const batch = writeBatch(firestore);
  batch.update(doc(firestore, collections.globalCategories, categoryId), { status, updatedAt: now });
  batch.set(doc(collection(firestore, collections.auditLogs)), auditPayload(adminUserId, status === "BLOCKED" ? "BLOCK" : "UNBLOCK", "globalCategory", categoryId, now));
  await batch.commit();
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [metrics, categories, audits] = await Promise.all([
    getDoc(doc(firestore, collections.adminMetrics, "overview")),
    getDocs(query(collection(firestore, collections.globalCategories), limit(200))),
    getDocs(query(collection(firestore, collections.auditLogs), orderBy("createdAt", "desc"), limit(20))),
  ]);
  return { registeredUsers: metrics.exists() && Number.isInteger(metrics.data().registeredUsers) ? metrics.data().registeredUsers : null, globalCategories: categories.size, recentActions: audits.size };
}

export async function listAuditLogs() {
  const snapshot = await getDocs(query(collection(firestore, collections.auditLogs).withConverter(auditConverter), orderBy("createdAt", "desc"), limit(50)));
  return snapshot.docs.map((item) => item.data());
}

function auditPayload(userId: string, action: string, entity: string, entityId: string, createdAt: Timestamp) { return { userId, action, entity, entityId, createdAt }; }

function validateGlobalCategory(input: GlobalCategoryInput) {
  if (!input.name.trim()) throw new Error("Informe o nome da categoria global.");
  if (!input.icon || !input.color) throw new Error("Informe icone e cor.");
}
