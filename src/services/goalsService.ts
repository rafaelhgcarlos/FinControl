import { Timestamp, collection, doc, getDocs, limit, orderBy, query, runTransaction, setDoc, updateDoc, where } from "firebase/firestore";
import { applyGoalAmount, calculateGoalProgress, resolveGoalStatus } from "../business/goals";
import { collections } from "../firebase/collections";
import { firestore } from "../firebase/config";
import type { FinancialGoal, GoalStatus } from "../types/goal";
import { createConverter } from "./firestoreConverters";

const goalConverter = createConverter<FinancialGoal>();

export type GoalInput = {
  name: string;
  targetAmountInCents: number;
  currentAmountInCents: number;
  deadline?: Date;
  category?: string;
  icon?: string;
  status?: GoalStatus;
};

export async function listGoals(userId: string) {
  const snapshot = await getDocs(query(
    collection(firestore, collections.goals).withConverter(goalConverter),
    where("userId", "==", userId), orderBy("createdAt", "desc"), limit(100),
  ));
  return snapshot.docs.map((item) => calculateGoalProgress(item.data()));
}

export async function createGoal(userId: string, input: GoalInput) {
  validateGoal(input);
  const now = Timestamp.now();
  const status = resolveGoalStatus(input.status ?? "ACTIVE", input.currentAmountInCents, input.targetAmountInCents);
  await setDoc(doc(collection(firestore, collections.goals)), toPayload(userId, input, status, now, true));
}

export async function updateGoal(userId: string, goalId: string, input: GoalInput) {
  validateGoal(input);
  const status = resolveGoalStatus(input.status ?? "ACTIVE", input.currentAmountInCents, input.targetAmountInCents);
  await updateDoc(doc(firestore, collections.goals, goalId), toPayload(userId, input, status, Timestamp.now(), false));
}

export async function changeGoalAmount(goalId: string, deltaInCents: number) {
  if (!Number.isInteger(deltaInCents) || deltaInCents === 0) throw new Error("Informe um valor valido.");
  const goalRef = doc(firestore, collections.goals, goalId).withConverter(goalConverter);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(goalRef);
    if (!snapshot.exists()) throw new Error("Meta nao encontrada.");
    const goal = snapshot.data();
    const currentAmountInCents = applyGoalAmount(goal.currentAmountInCents, deltaInCents);
    transaction.update(goalRef, {
      currentAmountInCents,
      status: resolveGoalStatus(goal.status, currentAmountInCents, goal.targetAmountInCents),
      updatedAt: Timestamp.now(),
    });
  });
}

export async function archiveGoal(goalId: string) {
  await updateDoc(doc(firestore, collections.goals, goalId), { status: "ARCHIVED", updatedAt: Timestamp.now() });
}

function toPayload(userId: string, input: GoalInput, status: GoalStatus, now: Timestamp, create: boolean) {
  const payload = {
    userId, name: input.name.trim(), targetAmountInCents: input.targetAmountInCents,
    currentAmountInCents: input.currentAmountInCents, deadline: input.deadline ? Timestamp.fromDate(input.deadline) : null,
    category: input.category?.trim() || null, icon: input.icon ?? "Target", status, updatedAt: now,
  };
  return create ? { ...payload, createdAt: now } : payload;
}

function validateGoal(input: GoalInput) {
  if (!input.name.trim()) throw new Error("Informe o nome da meta.");
  if (!Number.isInteger(input.targetAmountInCents) || input.targetAmountInCents <= 0) throw new Error("Informe um objetivo maior que zero.");
  if (!Number.isInteger(input.currentAmountInCents) || input.currentAmountInCents < 0) throw new Error("O valor atual nao pode ser negativo.");
}
