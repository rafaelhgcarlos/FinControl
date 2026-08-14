import {
  Timestamp,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
  type Transaction,
} from "firebase/firestore";
import { collections } from "../firebase/collections";
import { firestore } from "../firebase/config";
import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { CardInstallment, CardInvoice, CardPayment, CardPurchase, CreditCard, CreditCardBrand, CreditCardStatus, InvoiceStatus } from "../types/creditCard";
import { createConverter } from "./firestoreConverters";

const cardConverter = createConverter<CreditCard>();
const purchaseConverter = createConverter<CardPurchase>();
const installmentConverter = createConverter<CardInstallment>();
const invoiceConverter = createConverter<CardInvoice>();
const paymentConverter = createConverter<CardPayment>();

export type CreditCardInput = {
  name: string;
  institution?: string;
  lastFour?: string;
  brand?: CreditCardBrand;
  limitInCents: number;
  closingDay: number;
  dueDay: number;
  color: string;
  status: CreditCardStatus;
};

export type CardPurchaseInput = {
  cardId: string;
  categoryId?: string;
  description: string;
  amountInCents: number;
  purchaseDate: Date;
  installmentsCount: number;
  firstInstallmentDate: Date;
  idempotencyKey: string;
};

export async function listCards(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(firestore, collections.cards).withConverter(cardConverter),
      where("userId", "==", userId),
      limit(100),
    ),
  );
  return snapshot.docs.map((item) => item.data()).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export async function listInvoices(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(firestore, collections.cardInvoices).withConverter(invoiceConverter),
      where("userId", "==", userId),
      limit(100),
    ),
  );
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
  return normalizedInvoices
    .sort((left, right) => right.dueDate.getTime() - left.dueDate.getTime());
}

export async function listInstallments(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(firestore, collections.cardInstallments).withConverter(installmentConverter),
      where("userId", "==", userId),
      limit(300),
    ),
  );
  return snapshot.docs.map((item) => item.data()).sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());
}

export async function listPurchases(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(firestore, collections.cardPurchases).withConverter(purchaseConverter),
      where("userId", "==", userId),
      limit(100),
    ),
  );
  return snapshot.docs.map((item) => item.data()).sort((left, right) => right.purchaseDate.getTime() - left.purchaseDate.getTime());
}

export async function listCardPayments(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(firestore, collections.cardPayments).withConverter(paymentConverter),
      where("userId", "==", userId),
      limit(200),
    ),
  );
  return snapshot.docs.map((item) => item.data()).sort((left, right) => right.paidAt.getTime() - left.paidAt.getTime());
}

export async function createCard(userId: string, input: CreditCardInput) {
  validateCardInput(input);
  const now = Timestamp.now();
  await setDoc(doc(collection(firestore, collections.cards)), {
    ...input,
    institution: input.institution?.trim() || null,
    lastFour: normalizeLastFour(input.lastFour),
    brand: input.brand ?? "OTHER",
    committedLimitInCents: 0,
    userId,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateCard(cardId: string, input: CreditCardInput) {
  validateCardInput(input);
  await updateDoc(doc(firestore, collections.cards, cardId), {
    name: input.name.trim(),
    institution: input.institution?.trim() || null,
    lastFour: normalizeLastFour(input.lastFour),
    brand: input.brand ?? "OTHER",
    limitInCents: input.limitInCents,
    closingDay: input.closingDay,
    dueDay: input.dueDay,
    color: input.color,
    status: input.status,
    updatedAt: Timestamp.now(),
  });
}

export async function archiveCard(userId: string, cardId: string) {
  const now = Timestamp.now();
  const cardRef = doc(firestore, collections.cards, cardId).withConverter(cardConverter);
  await runTransaction(firestore, async (transaction) => {
    const cardSnapshot = await transaction.get(cardRef);
    if (!cardSnapshot.exists()) throw new Error("Cartao nao encontrado.");
    const card = cardSnapshot.data();
    if (card.userId !== userId) throw new Error("Cartao de outro usuario.");
    transaction.update(cardRef, {
      status: "ARCHIVED",
      updatedAt: now,
    });
  });
}

export async function createCardPurchase(userId: string, input: CardPurchaseInput, cards: CreditCard[], categories: Category[] = []) {
  validatePurchaseInput(input, cards, userId, categories);
  const now = Timestamp.now();
  const card = cards.find((item) => item.id === input.cardId && item.userId === userId);
  if (!card) throw new Error("Selecione um cartao.");
  const purchaseId = `${userId}_${input.idempotencyKey}`;
  const purchaseRef = doc(firestore, collections.cardPurchases, purchaseId);
  const cardRef = doc(firestore, collections.cards, input.cardId).withConverter(cardConverter);
  const installments = buildInstallments(userId, purchaseId, input, card, now);
  const invoicePayloads = buildInvoicePayloads(userId, card, installments, now);

  await runTransaction(firestore, async (transaction) => {
    const [purchaseSnapshot, cardSnapshot, invoiceSnapshots, installmentSnapshots] = await Promise.all([
      transaction.get(purchaseRef),
      transaction.get(cardRef),
      Promise.all(invoicePayloads.map((invoice) => transaction.get(doc(firestore, collections.cardInvoices, invoice.id)))),
      Promise.all(installments.map((installment) => transaction.get(doc(firestore, collections.cardInstallments, installment.id)))),
    ]);
    if (purchaseSnapshot.exists() || installmentSnapshots.some((snapshot) => snapshot.exists())) {
      throw new Error("Esta compra ja foi registrada.");
    }
    if (!cardSnapshot.exists()) throw new Error("Cartao nao encontrado.");
    const currentCard = cardSnapshot.data();
    if (currentCard.status !== "ACTIVE") throw new Error("Cartao arquivado nao recebe novas compras.");
    if (currentCard.committedLimitInCents + input.amountInCents > currentCard.limitInCents) {
      throw new Error("Limite disponivel insuficiente.");
    }

    transaction.set(purchaseRef, {
      userId,
      cardId: input.cardId,
      categoryId: input.categoryId,
      description: input.description.trim(),
      amountInCents: input.amountInCents,
      purchaseDate: Timestamp.fromDate(input.purchaseDate),
      installmentsCount: input.installmentsCount,
      firstInstallmentDate: Timestamp.fromDate(input.firstInstallmentDate),
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });
    transaction.update(cardRef, {
      committedLimitInCents: currentCard.committedLimitInCents + input.amountInCents,
      updatedAt: now,
    });

    invoicePayloads.forEach((invoice, index) => {
      const invoiceRef = doc(firestore, collections.cardInvoices, invoice.id);
      const existingInvoice = invoiceSnapshots[index];
      if (existingInvoice.exists()) {
        transaction.update(invoiceRef, {
          totalInCents: increment(invoice.amountInCents),
          updatedAt: now,
        });
      } else {
        transaction.set(invoiceRef, invoice.data);
      }
    });
    installments.forEach((installment) => {
      transaction.set(doc(firestore, collections.cardInstallments, installment.id), installment.data);
    });
  });
}

export async function updateCardPurchase(userId: string, purchaseId: string, input: CardPurchaseInput, cards: CreditCard[], categories: Category[] = []) {
  validatePurchaseInput(input, cards, userId, categories);
  const now = Timestamp.now();
  const purchaseRef = doc(firestore, collections.cardPurchases, purchaseId).withConverter(purchaseConverter);

  await runTransaction(firestore, async (transaction) => {
    const purchaseSnapshot = await transaction.get(purchaseRef);
    if (!purchaseSnapshot.exists()) throw new Error("Compra nao encontrada.");
    const previousPurchase = purchaseSnapshot.data();
    if (previousPurchase.userId !== userId) throw new Error("Compra de outro usuario.");
    if (previousPurchase.cardId !== input.cardId) throw new Error("Para trocar o cartao, exclua e registre a compra novamente.");

    const cardRef = doc(firestore, collections.cards, previousPurchase.cardId).withConverter(cardConverter);
    const cardSnapshot = await transaction.get(cardRef);
    if (!cardSnapshot.exists()) throw new Error("Cartao nao encontrado.");
    const card = cardSnapshot.data();
    if (card.userId !== userId) throw new Error("Cartao de outro usuario.");

    const previousInstallmentRefs = Array.from({ length: previousPurchase.installmentsCount }, (_, index) =>
      doc(firestore, collections.cardInstallments, `${purchaseId}_${index + 1}`).withConverter(installmentConverter),
    );
    const previousInstallmentSnapshots = await Promise.all(previousInstallmentRefs.map((item) => transaction.get(item)));
    const previousInstallments = previousInstallmentSnapshots
      .filter((snapshot) => snapshot.exists())
      .map((snapshot) => snapshot.data());
    ensureEditableInstallments(previousInstallments);

    const nextInstallments = buildInstallments(userId, purchaseId, input, card, now);
    const invoiceIds = Array.from(new Set([
      ...previousInstallments.map((installment) => installment.invoiceId),
      ...nextInstallments.map((installment) => installment.invoiceId),
    ]));
    const invoiceRefs = invoiceIds.map((invoiceId) => doc(firestore, collections.cardInvoices, invoiceId));
    const invoiceSnapshots = await Promise.all(invoiceRefs.map((invoiceRef) => transaction.get(invoiceRef)));
    invoiceSnapshots.forEach((snapshot) => {
      if (snapshot.exists() && snapshot.data().paidInCents > 0) {
        throw new Error("Nao e possivel editar compra em fatura com pagamento registrado.");
      }
    });

    const committedDelta = input.amountInCents - previousPurchase.amountInCents;
    if (card.committedLimitInCents + committedDelta > card.limitInCents) {
      throw new Error("Limite disponivel insuficiente.");
    }

    transaction.update(purchaseRef, {
      description: input.description.trim(),
      categoryId: input.categoryId,
      amountInCents: input.amountInCents,
      purchaseDate: Timestamp.fromDate(input.purchaseDate),
      installmentsCount: input.installmentsCount,
      firstInstallmentDate: Timestamp.fromDate(input.firstInstallmentDate),
      updatedAt: now,
    });
    transaction.update(cardRef, {
      committedLimitInCents: Math.max(0, card.committedLimitInCents + committedDelta),
      updatedAt: now,
    });

    applyInvoiceDeltas(transaction, invoiceRefs, invoiceSnapshots, previousInstallments, nextInstallments, userId, card, now);
    nextInstallments.forEach((installment) => {
      transaction.set(doc(firestore, collections.cardInstallments, installment.id), installment.data);
    });
    previousInstallmentRefs.slice(nextInstallments.length).forEach((installmentRef) => {
      transaction.delete(installmentRef);
    });
  });
}

export async function deleteCardPurchase(userId: string, purchaseId: string) {
  const now = Timestamp.now();
  const purchaseRef = doc(firestore, collections.cardPurchases, purchaseId).withConverter(purchaseConverter);

  await runTransaction(firestore, async (transaction) => {
    const purchaseSnapshot = await transaction.get(purchaseRef);
    if (!purchaseSnapshot.exists()) throw new Error("Compra nao encontrada.");
    const purchase = purchaseSnapshot.data();
    if (purchase.userId !== userId) throw new Error("Compra de outro usuario.");

    const cardRef = doc(firestore, collections.cards, purchase.cardId).withConverter(cardConverter);
    const installmentRefs = Array.from({ length: purchase.installmentsCount }, (_, index) =>
      doc(firestore, collections.cardInstallments, `${purchaseId}_${index + 1}`).withConverter(installmentConverter),
    );
    const [cardSnapshot, installmentSnapshots] = await Promise.all([
      transaction.get(cardRef),
      Promise.all(installmentRefs.map((item) => transaction.get(item))),
    ]);
    if (!cardSnapshot.exists()) throw new Error("Cartao nao encontrado.");
    const card = cardSnapshot.data();
    if (card.userId !== userId) throw new Error("Cartao de outro usuario.");

    const installments = installmentSnapshots.filter((snapshot) => snapshot.exists()).map((snapshot) => snapshot.data());
    ensureEditableInstallments(installments);
    const invoiceIds = Array.from(new Set(installments.map((installment) => installment.invoiceId)));
    const invoiceRefs = invoiceIds.map((invoiceId) => doc(firestore, collections.cardInvoices, invoiceId));
    const invoiceSnapshots = await Promise.all(invoiceRefs.map((invoiceRef) => transaction.get(invoiceRef)));
    invoiceSnapshots.forEach((snapshot) => {
      if (snapshot.exists() && snapshot.data().paidInCents > 0) {
        throw new Error("Nao e possivel excluir item de fatura com pagamento registrado.");
      }
    });

    transaction.update(cardRef, {
      committedLimitInCents: Math.max(0, card.committedLimitInCents - purchase.amountInCents),
      updatedAt: now,
    });
    applyInvoiceDeltas(transaction, invoiceRefs, invoiceSnapshots, installments, [], userId, card, now);
    installmentRefs.forEach((installmentRef) => transaction.delete(installmentRef));
    transaction.delete(purchaseRef);
  });
}

export async function deleteCardInvoice(userId: string, invoiceId: string) {
  const now = Timestamp.now();
  const invoiceRef = doc(firestore, collections.cardInvoices, invoiceId).withConverter(invoiceConverter);
  const invoiceInstallmentsSnapshot = await getDocs(
    query(
      collection(firestore, collections.cardInstallments).withConverter(installmentConverter),
      where("userId", "==", userId),
      where("invoiceId", "==", invoiceId),
      limit(300),
    ),
  );
  const purchaseIds = Array.from(new Set(invoiceInstallmentsSnapshot.docs.map((snapshot) => snapshot.data().purchaseId)));
  const purchaseRefs = purchaseIds.map((purchaseId) => doc(firestore, collections.cardPurchases, purchaseId).withConverter(purchaseConverter));

  await runTransaction(firestore, async (transaction) => {
    const invoiceSnapshot = await transaction.get(invoiceRef);
    if (!invoiceSnapshot.exists()) throw new Error("Fatura nao encontrada.");
    const invoice = invoiceSnapshot.data();
    if (invoice.userId !== userId) throw new Error("Fatura de outro usuario.");
    if (invoice.paidInCents > 0 || invoice.status === "PAID") throw new Error("Nao e possivel excluir fatura com pagamento registrado.");

    const cardRef = doc(firestore, collections.cards, invoice.cardId).withConverter(cardConverter);
    const [cardSnapshot, purchaseSnapshots] = await Promise.all([
      transaction.get(cardRef),
      Promise.all(purchaseRefs.map((purchaseRef) => transaction.get(purchaseRef))),
    ]);
    if (!cardSnapshot.exists()) throw new Error("Cartao nao encontrado.");
    const card = cardSnapshot.data();
    if (card.userId !== userId) throw new Error("Cartao de outro usuario.");

    const purchasesToDelete = purchaseSnapshots
      .filter((snapshot) => snapshot.exists())
      .map((snapshot) => snapshot.data());
    const purchaseIdSet = new Set(purchasesToDelete.map((purchase) => purchase.id));
    const installmentRefs = purchasesToDelete.flatMap((purchase) =>
      Array.from({ length: purchase.installmentsCount }, (_, index) =>
        doc(firestore, collections.cardInstallments, `${purchase.id}_${index + 1}`).withConverter(installmentConverter),
      ),
    );
    const installmentSnapshots = await Promise.all(installmentRefs.map((installmentRef) => transaction.get(installmentRef)));
    const installmentsToDelete: CardInstallment[] = [];
    installmentSnapshots.forEach((snapshot) => {
      if (!snapshot.exists()) return;
      const installment = snapshot.data();
      if (purchaseIdSet.has(installment.purchaseId)) installmentsToDelete.push(installment);
    });
    ensureEditableInstallments(installmentsToDelete);

    const affectedInvoiceIds = Array.from(new Set(installmentsToDelete.map((installment) => installment.invoiceId))).filter((affectedInvoiceId) => affectedInvoiceId !== invoiceId);
    const affectedInvoiceRefs = affectedInvoiceIds.map((affectedInvoiceId) => doc(firestore, collections.cardInvoices, affectedInvoiceId));
    const affectedInvoiceSnapshots = await Promise.all(affectedInvoiceRefs.map((affectedInvoiceRef) => transaction.get(affectedInvoiceRef)));
    affectedInvoiceSnapshots.forEach((snapshot) => {
      if (snapshot.exists() && snapshot.data().paidInCents > 0) {
        throw new Error("Nao e possivel excluir fatura com compras que ja possuem pagamento em outro ciclo.");
      }
    });

    transaction.update(cardRef, {
      committedLimitInCents: Math.max(0, card.committedLimitInCents - purchasesToDelete.reduce((total, purchase) => total + purchase.amountInCents, 0)),
      updatedAt: now,
    });
    applyInvoiceDeltas(transaction, affectedInvoiceRefs, affectedInvoiceSnapshots, installmentsToDelete, [], userId, card, now);
    installmentRefs.forEach((installmentRef) => transaction.delete(installmentRef));
    purchaseRefs.forEach((purchaseRef) => transaction.delete(purchaseRef));
    transaction.delete(invoiceRef);
  });
}

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
    const remaining = invoice.totalInCents - invoice.paidInCents;
    const paymentAmount = Math.min(amountInCents, remaining);
    const nextPaid = invoice.paidInCents + paymentAmount;

    transaction.update(accountRef, {
      currentBalanceInCents: (accountSnapshot.data().currentBalanceInCents as number) - paymentAmount,
      updatedAt: now,
    });
    transaction.update(cardRef, {
      committedLimitInCents: Math.max(0, cardSnapshot.data().committedLimitInCents - paymentAmount),
      updatedAt: now,
    });
    transaction.update(invoiceRef, {
      paidInCents: nextPaid,
      status: nextPaid >= invoice.totalInCents ? "PAID" : invoice.status,
      updatedAt: now,
    });
    transaction.set(paymentRef, {
      userId,
      cardId: invoice.cardId,
      invoiceId,
      accountId,
      amountInCents: paymentAmount,
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    } satisfies Omit<CardPayment, "id" | "paidAt" | "createdAt" | "updatedAt"> & { paidAt: Timestamp; createdAt: Timestamp; updatedAt: Timestamp });
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
    const [invoiceSnapshot, cardSnapshot, accountSnapshot] = await Promise.all([
      transaction.get(invoiceRef),
      transaction.get(cardRef),
      transaction.get(accountRef),
    ]);
    if (!invoiceSnapshot.exists()) throw new Error("Fatura nao encontrada.");
    if (!cardSnapshot.exists()) throw new Error("Cartao nao encontrado.");
    if (!accountSnapshot.exists()) throw new Error("Conta nao encontrada.");

    const invoice = invoiceSnapshot.data();
    const card = cardSnapshot.data();
    if (invoice.userId !== userId || card.userId !== userId || accountSnapshot.data().userId !== userId) {
      throw new Error("Dados de outro usuario.");
    }
    const nextPaidInCents = Math.max(0, invoice.paidInCents - payment.amountInCents);
    const nextCommittedLimit = card.committedLimitInCents + payment.amountInCents;
    if (nextCommittedLimit > card.limitInCents) {
      throw new Error("Nao e possivel remover este pagamento porque o limite do cartao ficaria excedido.");
    }

    transaction.update(accountRef, {
      currentBalanceInCents: (accountSnapshot.data().currentBalanceInCents as number) + payment.amountInCents,
      updatedAt: now,
    });
    transaction.update(cardRef, {
      committedLimitInCents: nextCommittedLimit,
      updatedAt: now,
    });
    transaction.update(invoiceRef, {
      paidInCents: nextPaidInCents,
      status: nextPaidInCents >= invoice.totalInCents ? "PAID" : computeInvoiceStatus(invoice.dueDate),
      updatedAt: now,
    });
    transaction.delete(paymentRef);
  });
}

function validateCardInput(input: CreditCardInput) {
  if (!input.name.trim()) throw new Error("Informe o nome do cartao.");
  if (input.limitInCents <= 0) throw new Error("Informe um limite maior que zero.");
  if (!isValidDay(input.closingDay) || !isValidDay(input.dueDay)) throw new Error("Dias de fechamento e vencimento devem estar entre 1 e 31.");
  if (input.lastFour && !/^\d{4}$/.test(input.lastFour)) throw new Error("Informe os 4 ultimos digitos do cartao.");
  if (input.brand && !["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OTHER"].includes(input.brand)) throw new Error("Bandeira do cartao invalida.");
}

function normalizeLastFour(value?: string) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits ? digits.slice(-4) : null;
}

function validatePurchaseInput(input: CardPurchaseInput, cards: CreditCard[], userId: string, categories: Category[] = []) {
  const card = cards.find((item) => item.id === input.cardId && item.userId === userId);
  if (!card) throw new Error("Selecione um cartao.");
  if (card.status !== "ACTIVE") throw new Error("Cartao arquivado nao recebe novas compras.");
  const category = categories.find((item) => item.id === input.categoryId && item.userId === userId);
  if (!category || category.type !== "EXPENSE" || category.status !== "ACTIVE") throw new Error("Selecione uma categoria de despesa ativa.");
  if (!input.description.trim()) throw new Error("Informe a descricao da compra.");
  if (input.amountInCents <= 0) throw new Error("Informe um valor maior que zero.");
  if (!Number.isInteger(input.installmentsCount) || input.installmentsCount < 1 || input.installmentsCount > 48) {
    throw new Error("A quantidade de parcelas deve estar entre 1 e 48.");
  }
  if (!input.idempotencyKey) throw new Error("Nao foi possivel identificar esta compra. Tente novamente.");
}

function buildInstallments(userId: string, purchaseId: string, input: CardPurchaseInput, card: CreditCard, now: Timestamp) {
  const baseAmount = Math.floor(input.amountInCents / input.installmentsCount);
  const remainder = input.amountInCents % input.installmentsCount;
  return Array.from({ length: input.installmentsCount }, (_, index) => {
    const dueDate = addMonths(resolveInvoiceCycleDate(input.firstInstallmentDate, card.closingDay), index);
    const invoice = buildInvoiceDates(dueDate, card.closingDay, card.dueDay);
    const installmentNumber = index + 1;
    const amountInCents = baseAmount + (index === 0 ? remainder : 0);
    const id = `${purchaseId}_${installmentNumber}`;
    return {
      id,
      invoiceId: `${input.cardId}_${invoice.cycleKey}`,
      amountInCents,
      data: {
        userId,
        purchaseId,
        cardId: input.cardId,
        categoryId: input.categoryId,
        invoiceId: `${input.cardId}_${invoice.cycleKey}`,
        installmentNumber,
        installmentsCount: input.installmentsCount,
        amountInCents,
        dueDate: Timestamp.fromDate(invoice.dueDate),
        description: input.description.trim(),
        status: "OPEN",
        createdAt: now,
        updatedAt: now,
      },
    };
  });
}

function ensureEditableInstallments(installments: CardInstallment[]) {
  if (installments.some((installment) => installment.status === "PAID")) {
    throw new Error("Nao e possivel alterar parcelas ja pagas.");
  }
}

function applyInvoiceDeltas(
  transaction: Transaction,
  invoiceRefs: DocumentReference[],
  invoiceSnapshots: Awaited<ReturnType<Transaction["get"]>>[],
  previousInstallments: CardInstallment[],
  nextInstallments: ReturnType<typeof buildInstallments>,
  userId: string,
  card: CreditCard,
  now: Timestamp,
) {
  const previousTotals = sumInstallmentsByInvoice(previousInstallments);
  const nextTotals = sumInstallmentPayloadsByInvoice(nextInstallments);
  invoiceRefs.forEach((invoiceRef, index) => {
    const previousTotal = previousTotals.get(invoiceRef.id) ?? 0;
    const nextTotal = nextTotals.get(invoiceRef.id) ?? 0;
    const delta = nextTotal - previousTotal;
    if (delta === 0) return;

    const snapshot = invoiceSnapshots[index];
    if (snapshot.exists()) {
      const invoice = snapshot.data() as CardInvoice;
      const nextInvoiceTotal = invoice.totalInCents + delta;
      if (nextInvoiceTotal < invoice.paidInCents) {
        throw new Error("A fatura ja possui pagamento maior que o novo total.");
      }
      transaction.update(invoiceRef, {
        totalInCents: Math.max(0, nextInvoiceTotal),
        status: nextInvoiceTotal <= 0 ? "OPEN" : invoice.status,
        updatedAt: now,
      });
      return;
    }

    if (nextTotal <= 0) return;
    const cycleKey = invoiceRef.id.replace(`${card.id}_`, "");
    const [year, month] = cycleKey.split("-").map(Number);
    const dates = buildInvoiceDates(new Date(year, month - 1, 1), card.closingDay, card.dueDay);
    transaction.set(invoiceRef, {
      userId,
      cardId: card.id,
      cycleKey,
      totalInCents: nextTotal,
      paidInCents: 0,
      closingDate: Timestamp.fromDate(dates.closingDate),
      dueDate: Timestamp.fromDate(dates.dueDate),
      status: computeInvoiceStatus(dates.dueDate),
      createdAt: now,
      updatedAt: now,
    });
  });
}

function sumInstallmentsByInvoice(installments: CardInstallment[]) {
  const totals = new Map<string, number>();
  installments.forEach((installment) => totals.set(installment.invoiceId, (totals.get(installment.invoiceId) ?? 0) + installment.amountInCents));
  return totals;
}

function sumInstallmentPayloadsByInvoice(installments: ReturnType<typeof buildInstallments>) {
  const totals = new Map<string, number>();
  installments.forEach((installment) => totals.set(installment.invoiceId, (totals.get(installment.invoiceId) ?? 0) + installment.amountInCents));
  return totals;
}

function buildInvoicePayloads(userId: string, card: CreditCard, installments: ReturnType<typeof buildInstallments>, now: Timestamp) {
  const byInvoice = new Map<string, number>();
  installments.forEach((installment) => byInvoice.set(installment.invoiceId, (byInvoice.get(installment.invoiceId) ?? 0) + installment.amountInCents));
  return Array.from(byInvoice.entries()).map(([invoiceId, amountInCents]) => {
    const cycleKey = invoiceId.replace(`${card.id}_`, "");
    const [year, month] = cycleKey.split("-").map(Number);
    const dates = buildInvoiceDates(new Date(year, month - 1, 1), card.closingDay, card.dueDay);
    return {
      id: invoiceId,
      amountInCents,
      data: {
        userId,
        cardId: card.id,
        cycleKey,
        totalInCents: amountInCents,
        paidInCents: 0,
        closingDate: Timestamp.fromDate(dates.closingDate),
        dueDate: Timestamp.fromDate(dates.dueDate),
        status: computeInvoiceStatus(dates.dueDate),
        createdAt: now,
        updatedAt: now,
      },
    };
  });
}

function buildInvoiceDates(cycleDate: Date, closingDay: number, dueDay: number) {
  const year = cycleDate.getFullYear();
  const month = cycleDate.getMonth();
  const closingDate = new Date(year, month, clampDay(year, month, closingDay), 23, 59, 59, 999);
  const dueMonth = dueDay <= closingDay ? month + 1 : month;
  const dueDate = new Date(year, dueMonth, clampDay(year, dueMonth, dueDay), 23, 59, 59, 999);
  return {
    cycleKey: `${closingDate.getFullYear()}-${String(closingDate.getMonth() + 1).padStart(2, "0")}`,
    closingDate,
    dueDate,
  };
}

function resolveInvoiceCycleDate(purchaseDate: Date, closingDay: number) {
  const base = new Date(purchaseDate);
  if (purchaseDate.getDate() > closingDay) {
    base.setMonth(base.getMonth() + 1);
  }
  return base;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, new Date(year, month + 1, 0).getDate());
}

function computeInvoiceStatus(dueDate: Date): InvoiceStatus {
  return dueDate < new Date() ? "OVERDUE" : "OPEN";
}

function normalizeInvoice(invoice: CardInvoice) {
  if (invoice.status === "PAID") return invoice;
  if (invoice.dueDate < new Date()) return { ...invoice, status: "OVERDUE" as const };
  if (invoice.closingDate < new Date()) return { ...invoice, status: "CLOSED" as const };
  return invoice;
}

function isValidDay(day: number) {
  return Number.isInteger(day) && day >= 1 && day <= 31;
}
