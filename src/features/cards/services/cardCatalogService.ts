import { Timestamp, collection, doc, getDocs, limit, query, runTransaction, setDoc, updateDoc, where } from "firebase/firestore";
import { collections } from "../../../firebase/collections";
import { firestore } from "../../../firebase/config";
import type { CreditCard, CreditCardBrand, CreditCardStatus } from "../../../types/creditCard";
import { createConverter } from "../../../services/firestoreConverters";

const cardConverter = createConverter<CreditCard>();

export type CreditCardInput = {
  name: string; institution?: string; lastFour?: string; brand?: CreditCardBrand;
  limitInCents: number; closingDay: number; dueDay: number; color: string; status: CreditCardStatus;
};

export async function createCard(userId: string, input: CreditCardInput) {
  validateCardInput(input); const now = Timestamp.now();
  await setDoc(doc(collection(firestore, collections.cards)), { ...input, institution: input.institution?.trim() || null, lastFour: normalizeLastFour(input.lastFour), brand: input.brand ?? "OTHER", committedLimitInCents: 0, userId, createdAt: now, updatedAt: now });
}

export async function updateCard(cardId: string, input: CreditCardInput) {
  validateCardInput(input);
  await updateDoc(doc(firestore, collections.cards, cardId), { name: input.name.trim(), institution: input.institution?.trim() || null, lastFour: normalizeLastFour(input.lastFour), brand: input.brand ?? "OTHER", limitInCents: input.limitInCents, closingDay: input.closingDay, dueDay: input.dueDay, color: input.color, status: input.status, updatedAt: Timestamp.now() });
}

export async function archiveCard(userId: string, cardId: string) {
  const cardRef = doc(firestore, collections.cards, cardId).withConverter(cardConverter);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(cardRef); if (!snapshot.exists()) throw new Error("Cartao nao encontrado.");
    if (snapshot.data().userId !== userId) throw new Error("Cartao de outro usuario.");
    transaction.update(cardRef, { status: "ARCHIVED", updatedAt: Timestamp.now() });
  });
}

export async function deleteUnusedCard(userId: string, cardId: string) {
  const usage = await Promise.all([collections.cardPurchases, collections.cardInstallments, collections.cardInvoices, collections.cardPayments].map((name) => hasCardUsage(userId, name, cardId)));
  if (usage.some(Boolean)) throw new Error("Este cartao ja possui compras, faturas, parcelas ou pagamentos. Arquive para preservar o historico.");
  const cardRef = doc(firestore, collections.cards, cardId).withConverter(cardConverter);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(cardRef); if (!snapshot.exists()) throw new Error("Cartao nao encontrado.");
    if (snapshot.data().userId !== userId) throw new Error("Cartao de outro usuario."); transaction.delete(cardRef);
  });
}

async function hasCardUsage(userId: string, collectionName: string, cardId: string) {
  return !(await getDocs(query(collection(firestore, collectionName), where("userId", "==", userId), where("cardId", "==", cardId), limit(1)))).empty;
}
function validateCardInput(input: CreditCardInput) {
  if (!input.name.trim()) throw new Error("Informe o nome do cartao.");
  if (input.limitInCents <= 0) throw new Error("Informe um limite maior que zero.");
  if (!isValidDay(input.closingDay) || !isValidDay(input.dueDay)) throw new Error("Dias de fechamento e vencimento devem estar entre 1 e 31.");
  if (input.lastFour && !/^\d{4}$/.test(input.lastFour)) throw new Error("Informe os 4 ultimos digitos do cartao.");
  if (input.brand && !["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OTHER"].includes(input.brand)) throw new Error("Bandeira do cartao invalida.");
}
function normalizeLastFour(value?: string) { const digits = value?.replace(/\D/g, "") ?? ""; return digits ? digits.slice(-4) : null; }
function isValidDay(day: number) { return Number.isInteger(day) && day >= 1 && day <= 31; }
