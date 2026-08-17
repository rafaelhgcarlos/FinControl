import { Timestamp, collection, doc, getDocs, limit, query, where, writeBatch } from "firebase/firestore";
import { collections } from "../../../firebase/collections";
import { firestore } from "../../../firebase/config";
import type { CardInstallment, CardInvoice, CardPayment, CardPurchase, CreditCard } from "../../../types/creditCard";
import { normalizeInvoice } from "./cardsCalculations";
import { createConverter } from "../../../services/firestoreConverters";

const cardConverter = createConverter<CreditCard>();
const purchaseConverter = createConverter<CardPurchase>();
const installmentConverter = createConverter<CardInstallment>();
const invoiceConverter = createConverter<CardInvoice>();
const paymentConverter = createConverter<CardPayment>();

export async function listCards(userId: string) {
  const snapshot = await getDocs(query(collection(firestore, collections.cards).withConverter(cardConverter), where("userId", "==", userId), limit(100)));
  return snapshot.docs.map((item) => item.data()).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export async function listInvoices(userId: string) {
  const snapshot = await getDocs(query(collection(firestore, collections.cardInvoices).withConverter(invoiceConverter), where("userId", "==", userId), limit(100)));
  const normalizedInvoices = snapshot.docs.map((item) => normalizeInvoice(item.data()));
  const batch = writeBatch(firestore);
  let hasStatusUpdates = false;
  normalizedInvoices.forEach((invoice) => {
    const storedStatus = snapshot.docs.find((item) => item.id === invoice.id)?.data().status;
    if (storedStatus && storedStatus !== invoice.status) {
      batch.update(doc(firestore, collections.cardInvoices, invoice.id), { status: invoice.status, updatedAt: Timestamp.now() });
      hasStatusUpdates = true;
    }
  });
  if (hasStatusUpdates) await batch.commit();
  return normalizedInvoices.sort((left, right) => right.dueDate.getTime() - left.dueDate.getTime());
}

export async function listInstallments(userId: string) {
  const snapshot = await getDocs(query(collection(firestore, collections.cardInstallments).withConverter(installmentConverter), where("userId", "==", userId), limit(300)));
  return snapshot.docs.map((item) => item.data()).sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());
}

export async function listPurchases(userId: string) {
  const snapshot = await getDocs(query(collection(firestore, collections.cardPurchases).withConverter(purchaseConverter), where("userId", "==", userId), limit(100)));
  return snapshot.docs.map((item) => item.data()).sort((left, right) => right.purchaseDate.getTime() - left.purchaseDate.getTime());
}

export async function listCardPayments(userId: string) {
  const snapshot = await getDocs(query(collection(firestore, collections.cardPayments).withConverter(paymentConverter), where("userId", "==", userId), limit(200)));
  return snapshot.docs.map((item) => item.data()).sort((left, right) => right.paidAt.getTime() - left.paidAt.getTime());
}
