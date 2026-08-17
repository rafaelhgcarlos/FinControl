import { Timestamp, collection, doc, runTransaction } from "firebase/firestore";
import { collections } from "../firebase/collections";
import { firestore } from "../firebase/config";
import type { Account } from "../types/account";
import type { CardInvoice, CardPayment, CreditCard } from "../types/creditCard";
import { computeInvoiceStatus } from "./cardsCalculations";
import { createConverter } from "./firestoreConverters";

const invoiceConverter = createConverter<CardInvoice>();
const cardConverter = createConverter<CreditCard>();
const paymentConverter = createConverter<CardPayment>();

export async function payInvoice(userId: string, invoiceId: string, accountId: string, amountInCents: number, accounts: Account[]) {
  if (amountInCents <= 0) throw new Error("Informe um valor de pagamento maior que zero.");
  const account = accounts.find((item) => item.id === accountId && item.userId === userId);
  if (!account || account.status === "ARCHIVED") throw new Error("Selecione uma conta ativa.");
  const now = Timestamp.now();
  const invoiceRef = doc(firestore, collections.cardInvoices, invoiceId).withConverter(invoiceConverter);
  const accountRef = doc(firestore, collections.accounts, accountId);
  const paymentRef = doc(collection(firestore, collections.cardPayments));
  await runTransaction(firestore, async (transaction) => {
    const invoiceSnapshot = await transaction.get(invoiceRef);
    if (!invoiceSnapshot.exists()) throw new Error("Fatura nao encontrada.");
    const invoice = invoiceSnapshot.data();
    if (invoice.userId !== userId) throw new Error("Fatura de outro usuario.");
    const cardRef = doc(firestore, collections.cards, invoice.cardId).withConverter(cardConverter);
    const [cardSnapshot, accountSnapshot] = await Promise.all([transaction.get(cardRef), transaction.get(accountRef)]);
    if (!cardSnapshot.exists()) throw new Error("Cartao nao encontrado.");
    if (!accountSnapshot.exists()) throw new Error("Conta nao encontrada.");
    const paymentAmount = Math.min(amountInCents, invoice.totalInCents - invoice.paidInCents);
    if (paymentAmount <= 0) throw new Error("Esta fatura ja esta paga.");
    const nextPaid = invoice.paidInCents + paymentAmount;
    transaction.update(accountRef, { currentBalanceInCents: (accountSnapshot.data().currentBalanceInCents as number) - paymentAmount, updatedAt: now });
    transaction.update(cardRef, { committedLimitInCents: Math.max(0, cardSnapshot.data().committedLimitInCents - paymentAmount), updatedAt: now });
    transaction.update(invoiceRef, { paidInCents: nextPaid, status: nextPaid >= invoice.totalInCents ? "PAID" : invoice.status, updatedAt: now });
    transaction.set(paymentRef, { userId, cardId: invoice.cardId, invoiceId, accountId, amountInCents: paymentAmount, paidAt: now, createdAt: now, updatedAt: now } satisfies Omit<CardPayment, "id" | "paidAt" | "createdAt" | "updatedAt"> & { paidAt: Timestamp; createdAt: Timestamp; updatedAt: Timestamp });
  });
}

export async function deleteCardPayment(userId: string, paymentId: string) {
  const now = Timestamp.now();
  const paymentRef = doc(firestore, collections.cardPayments, paymentId).withConverter(paymentConverter);
  await runTransaction(firestore, async (transaction) => {
    const paymentSnapshot = await transaction.get(paymentRef);
    if (!paymentSnapshot.exists()) throw new Error("Pagamento nao encontrado.");
    const payment = paymentSnapshot.data();
    if (payment.userId !== userId) throw new Error("Pagamento de outro usuario.");
    const invoiceRef = doc(firestore, collections.cardInvoices, payment.invoiceId).withConverter(invoiceConverter);
    const cardRef = doc(firestore, collections.cards, payment.cardId).withConverter(cardConverter);
    const accountRef = doc(firestore, collections.accounts, payment.accountId);
    const [invoiceSnapshot, cardSnapshot, accountSnapshot] = await Promise.all([transaction.get(invoiceRef), transaction.get(cardRef), transaction.get(accountRef)]);
    if (!invoiceSnapshot.exists() || !cardSnapshot.exists() || !accountSnapshot.exists()) throw new Error("Dados do pagamento nao encontrados.");
    const invoice = invoiceSnapshot.data(); const card = cardSnapshot.data();
    if (invoice.userId !== userId || card.userId !== userId || accountSnapshot.data().userId !== userId) throw new Error("Dados de outro usuario.");
    const nextPaidInCents = Math.max(0, invoice.paidInCents - payment.amountInCents);
    const nextCommittedLimit = card.committedLimitInCents + payment.amountInCents;
    if (nextCommittedLimit > card.limitInCents) throw new Error("Nao e possivel remover este pagamento porque o limite do cartao ficaria excedido.");
    transaction.update(accountRef, { currentBalanceInCents: (accountSnapshot.data().currentBalanceInCents as number) + payment.amountInCents, updatedAt: now });
    transaction.update(cardRef, { committedLimitInCents: nextCommittedLimit, updatedAt: now });
    transaction.update(invoiceRef, { paidInCents: nextPaidInCents, status: nextPaidInCents >= invoice.totalInCents ? "PAID" : computeInvoiceStatus(invoice.dueDate), updatedAt: now });
    transaction.delete(paymentRef);
  });
}
