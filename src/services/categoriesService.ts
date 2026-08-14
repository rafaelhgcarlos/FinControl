import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { collections } from "../firebase/collections";
import { firestore } from "../firebase/config";
import type { Category, CategoryType } from "../types/category";
import { createConverter } from "./firestoreConverters";

const categoryConverter = createConverter<Category>();

const defaultIncomeCategories = ["Salário", "Freelance", "Investimentos", "Vendas", "Outros"];
const defaultExpenseCategories = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Assinaturas",
  "Contas",
  "Impostos",
  "Outros",
];

const defaultColors = ["#059669", "#2563eb", "#7c3aed", "#dc2626", "#d97706", "#0891b2"];

export type CategoryInput = {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

export function defaultCategories() {
  return [
    ...defaultIncomeCategories.map((name, index) => ({ name, type: "INCOME" as const, icon: "CircleDollarSign", color: defaultColors[index % defaultColors.length] })),
    ...defaultExpenseCategories.map((name, index) => ({ name, type: "EXPENSE" as const, icon: "Tag", color: defaultColors[index % defaultColors.length] })),
  ];
}

export async function ensureDefaultCategories(userId: string) {
  const now = Timestamp.now();
  const existingSnapshot = await getDocs(
    query(
      collection(firestore, collections.categories).withConverter(categoryConverter),
      where("userId", "==", userId),
      limit(100),
    ),
  );
  const existingById = new Map(existingSnapshot.docs.map((item) => [item.id, item.data()]));

  await Promise.all(
    defaultCategories().map(async (category) => {
      const categoryId = `${userId}_${category.type}_${slugify(category.name)}`;
      const categoryRef = doc(firestore, collections.categories, categoryId);
      const existingCategory = existingById.get(categoryId);
      if (!existingCategory) {
        await setDoc(categoryRef, {
          ...category,
          userId,
          status: "ACTIVE",
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        });
        return;
      }
      await setDoc(categoryRef, {
        ...category,
        userId,
        status: existingCategory.status ?? "ACTIVE",
        isDefault: true,
        createdAt: existingCategory.createdAt ?? now,
        updatedAt: now,
      }, { merge: true });
    }),
  );
}

export async function listCategories(userId: string) {
  await ensureDefaultCategories(userId);
  const snapshot = await getDocs(
    query(
      collection(firestore, collections.categories).withConverter(categoryConverter),
      where("userId", "==", userId),
      limit(100),
    ),
  );
  return snapshot.docs
    .map((item) => item.data())
    .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name, "pt-BR"));
}

export async function createCategory(userId: string, input: CategoryInput) {
  const now = Timestamp.now();
  await addDoc(collection(firestore, collections.categories), {
    ...input,
    userId,
    status: "ACTIVE",
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function archiveCategory(categoryId: string) {
  await updateDoc(doc(firestore, collections.categories, categoryId), {
    status: "ARCHIVED",
    updatedAt: Timestamp.now(),
  });
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
