import { Plus, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { CardsSkeleton } from "../components/ui/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { CardDetailView, CardNotFound, type CardTab } from "../features/cards/components/CardDetailView";
import { CardFormModal, ConfirmActionModal, PaymentFormModal, PurchaseFormModal } from "../features/cards/components/CardForms";
import { CardsOverview } from "../features/cards/components/CardsOverview";
import { defaultInvoiceView, type InvoiceViewState } from "../features/cards/cardViewUtils";
import { useActionLock } from "../hooks/useActionLock";
import { listAccounts } from "../services/accountsService";
import { listCategories } from "../services/categoriesService";
import {
  archiveCard,
  createCard,
  createCardPurchase,
  deleteCardInvoice,
  deleteCardPayment,
  deleteCardPurchase,
  deleteUnusedCard,
  listCardPayments,
  listCards,
  listInstallments,
  listInvoices,
  listPurchases,
  payInvoice,
  updateCard,
  updateCardPurchase,
  type CardPurchaseInput,
  type CreditCardInput,
} from "../features/cards";
import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { CardInvoice, CardPayment, CardPurchase, CreditCard as CreditCardType } from "../types/creditCard";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { formatCurrencyFromCents } from "../utils/money";

const initialCardForm: CreditCardInput = {
  name: "",
  institution: "",
  lastFour: "",
  brand: "OTHER",
  limitInCents: 0,
  closingDay: 10,
  dueDay: 20,
  color: "#2563eb",
  status: "ACTIVE",
};

export function CardsPage() {
  return <CardsModulePage />;
}

export function CardDetailPage({ cardId }: { cardId: string }) {
  return <CardsModulePage cardId={cardId} detail />;
}

function CardsModulePage({ cardId, detail = false }: { cardId?: string; detail?: boolean }) {
  const { user } = useAuth();
  const toast = useToast();
  const { isActionPending, runAction } = useActionLock();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [invoices, setInvoices] = useState<CardInvoice[]>([]);
  const [installments, setInstallments] = useState<Awaited<ReturnType<typeof listInstallments>>>([]);
  const [purchases, setPurchases] = useState<CardPurchase[]>([]);
  const [payments, setPayments] = useState<CardPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cardForm, setCardForm] = useState<CreditCardInput>(initialCardForm);
  const [purchaseForm, setPurchaseForm] = useState<CardPurchaseInput>(() => emptyPurchaseForm());
  const [paymentForm, setPaymentForm] = useState({ invoiceId: "", accountId: "", amountInCents: 0 });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; action: () => Promise<void> } | null>(null);
  const [modal, setModal] = useState<"card" | "purchase" | "payment" | "confirm" | null>(null);
  const [invoiceViews, setInvoiceViews] = useState<Record<string, InvoiceViewState>>({});
  const [activeTab, setActiveTab] = useState<CardTab>("invoice");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [nextCards, nextInvoices, nextInstallments, nextPurchases, nextPayments, nextAccounts, nextCategories] = await Promise.all([
      listCards(user.uid), listInvoices(user.uid), listInstallments(user.uid), listPurchases(user.uid),
      listCardPayments(user.uid), listAccounts(user.uid), listCategories(user.uid),
    ]);
    setCards(nextCards);
    setInvoices(nextInvoices);
    setInstallments(nextInstallments);
    setPurchases(nextPurchases);
    setPayments(nextPayments);
    setAccounts(nextAccounts);
    setCategories(nextCategories);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadData().catch((error) => {
      toast.error(getFriendlyFirebaseError(error, "Não foi possível carregar os cartões."));
      setLoading(false);
    });
  }, [loadData, toast]);

  useEffect(() => {
    if (!loading && searchParams.get("new") === "purchase") {
      setEditingPurchaseId(null);
      setPurchaseForm({ ...emptyPurchaseForm(), cardId: cards.find((card) => card.status === "ACTIVE")?.id ?? "" });
      setModal("purchase");
      setSearchParams({}, { replace: true });
    }
  }, [cards, loading, searchParams, setSearchParams]);

  const totals = useMemo(() => {
    const activeCards = cards.filter((card) => card.status === "ACTIVE");
    const limitTotal = activeCards.reduce((total, card) => total + card.limitInCents, 0);
    const committed = activeCards.reduce((total, card) => total + card.committedLimitInCents, 0);
    const accountBalance = accounts.filter((account) => account.status === "ACTIVE").reduce((total, account) => total + account.currentBalanceInCents, 0);
    return { limitTotal, committed, available: limitTotal - committed, accountBalance };
  }, [accounts, cards]);
  const selectedCard = useMemo(() => detail ? cards.find((card) => card.id === cardId) : undefined, [cardId, cards, detail]);
  const expenseCategories = useMemo(() => categories.filter((category) => category.type === "EXPENSE" && category.status === "ACTIVE"), [categories]);
  const actionsDisabled = isActionPending();

  function openCardForm(card?: CreditCardType) {
    setEditingCardId(card?.id ?? null);
    setCardForm(card ? { name: card.name, institution: card.institution ?? "", lastFour: card.lastFour ?? "", brand: card.brand ?? "OTHER", limitInCents: card.limitInCents, closingDay: card.closingDay, dueDay: card.dueDay, color: card.color, status: card.status } : initialCardForm);
    setModal("card");
  }

  function openPurchase(selectedCardId?: string) {
    setEditingPurchaseId(null);
    setPurchaseForm({ ...emptyPurchaseForm(), cardId: selectedCardId ?? cards.find((card) => card.status === "ACTIVE")?.id ?? "" });
    setModal("purchase");
  }

  function openEditPurchase(purchase: CardPurchase) {
    setEditingPurchaseId(purchase.id);
    setPurchaseForm({ cardId: purchase.cardId, categoryId: purchase.categoryId, description: purchase.description, amountInCents: purchase.amountInCents, purchaseDate: purchase.purchaseDate, installmentsCount: purchase.installmentsCount, firstInstallmentDate: purchase.firstInstallmentDate, idempotencyKey: purchase.idempotencyKey });
    setModal("purchase");
  }

  function openPayment(invoice: CardInvoice) {
    setPaymentForm({ invoiceId: invoice.id, accountId: accounts.find((account) => account.status === "ACTIVE")?.id ?? "", amountInCents: invoice.totalInCents - invoice.paidInCents });
    setModal("payment");
  }

  async function handleCardSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    await runAction("card:save", async () => {
      try {
        if (editingCardId) await updateCard(editingCardId, cardForm); else await createCard(user.uid, cardForm);
        toast.success(editingCardId ? "Cartão atualizado." : "Cartão criado.");
        setCardForm(initialCardForm); setEditingCardId(null); setModal(null); await loadData();
      } catch (error) { toast.error(getFriendlyFirebaseError(error, "Não foi possível salvar o cartão.")); }
    });
  }

  async function handlePurchaseSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    await runAction("purchase:save", async () => {
      try {
        if (editingPurchaseId) await updateCardPurchase(user.uid, editingPurchaseId, purchaseForm, cards, expenseCategories);
        else await createCardPurchase(user.uid, purchaseForm, cards, expenseCategories);
        toast.success(editingPurchaseId ? "Compra atualizada." : "Compra registrada.");
        setEditingPurchaseId(null); setModal(null); await loadData();
      } catch (error) { toast.error(getFriendlyFirebaseError(error, "Não foi possível registrar a compra.")); }
    });
  }

  function handlePaymentSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const invoice = invoices.find((item) => item.id === paymentForm.invoiceId);
    const account = accounts.find((item) => item.id === paymentForm.accountId);
    setConfirmAction({
      title: "Confirmar pagamento",
      description: `Pagar ${formatCurrencyFromCents(paymentForm.amountInCents)} da fatura ${invoice?.cycleKey ?? ""} usando ${account?.name ?? "a conta selecionada"}? O valor será descontado da conta e o limite será liberado.`,
      action: async () => { await payInvoice(user.uid, paymentForm.invoiceId, paymentForm.accountId, paymentForm.amountInCents, accounts); toast.success("Pagamento registrado."); await loadData(); },
    });
    setModal("confirm");
  }

  function requestArchiveCard(card: CreditCardType) {
    setConfirmAction({ title: "Arquivar cartão", description: `Arquivar "${card.name}" impede novas compras, mas preserva faturas, parcelas e histórico.`, action: async () => { if (!user) return; await archiveCard(user.uid, card.id); await loadData(); toast.success("Cartão arquivado.", { duration: 8000, action: { label: "Desfazer", onClick: async () => { await updateCard(card.id, cardToInput(card, "ACTIVE")); await loadData(); toast.success("Arquivamento desfeito."); } } }); } });
    setModal("confirm");
  }
  function requestDeleteCard(card: CreditCardType) {
    setConfirmAction({ title: "Apagar cartão", description: `Apagar "${card.name}" remove o cartão da carteira. Esta ação só será permitida se ele não tiver compras, faturas, parcelas ou pagamentos. Para cartões com histórico, use Arquivar.`, action: async () => { if (!user) return; await deleteUnusedCard(user.uid, card.id); toast.success("Cartão apagado."); await loadData(); } });
    setModal("confirm");
  }
  function requestDeletePurchase(purchase: CardPurchase) {
    setConfirmAction({ title: "Excluir compra", description: `Excluir "${purchase.description}" remove as parcelas abertas, corrige faturas e libera o limite comprometido. Faturas pagas não podem ser alteradas.`, action: async () => { if (!user) return; await deleteCardPurchase(user.uid, purchase.id); toast.success("Compra excluída."); await loadData(); } });
    setModal("confirm");
  }
  function requestDeleteInvoice(invoice: CardInvoice) {
    setConfirmAction({ title: "Excluir fatura", description: "Esta ação remove a fatura e as compras vinculadas a ela, corrige parcelas, faturas futuras e libera o limite. Faturas pagas não podem ser excluídas.", action: async () => { if (!user) return; await deleteCardInvoice(user.uid, invoice.id); toast.success("Fatura excluída."); await loadData(); } });
    setModal("confirm");
  }
  function requestDeletePayment(payment: CardPayment) {
    setConfirmAction({ title: "Remover pagamento", description: `Remover o pagamento de ${formatCurrencyFromCents(payment.amountInCents)}? O saldo voltará para a conta, a fatura será reaberta e o limite do cartão será comprometido novamente.`, action: async () => { if (!user) return; await deleteCardPayment(user.uid, payment.id); toast.success("Pagamento removido."); await loadData(); } });
    setModal("confirm");
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    await runAction("card:confirm", async () => {
      try { await confirmAction.action(); setConfirmAction(null); setModal(null); }
      catch (error) { toast.error(getFriendlyFirebaseError(error, "Não foi possível concluir a ação.")); }
    });
  }

  function updateInvoiceView(invoiceId: string, patch: Partial<InvoiceViewState>) {
    setInvoiceViews((current) => ({ ...current, [invoiceId]: { ...defaultInvoiceView, ...current[invoiceId], ...patch } }));
  }

  const pageTitle = selectedCard?.name ?? (detail ? "Cartão não encontrado" : "Cartões");
  const pageDescription = selectedCard ? "Fatura atual, compras, parcelas e histórico do cartão selecionado." : detail ? "Não encontramos o cartão solicitado." : "Controle seus cartões sem misturar faturas de bancos diferentes.";

  return <>
    <PageHeader title={pageTitle} description={pageDescription} action={<div className="flex flex-wrap gap-2">
      {detail ? <Button asChild variant="secondary"><Link to="/app/cards">Voltar</Link></Button> : null}
      {selectedCard ? <Button disabled={actionsDisabled} variant="secondary" onClick={() => openPurchase(selectedCard.id)}><ReceiptText className="h-4 w-4" aria-hidden="true" />Nova compra</Button> : null}
      {!detail ? <Button disabled={actionsDisabled} onClick={() => openCardForm()}><Plus className="h-4 w-4" aria-hidden="true" />Novo cartão</Button> : null}
    </div>} />
    {loading ? <CardsSkeleton /> : detail ? selectedCard ? (
      <CardDetailView accounts={accounts} actionsDisabled={actionsDisabled} activeTab={activeTab} card={selectedCard} categories={categories}
        installments={installments.filter((item) => item.cardId === selectedCard.id)} invoiceViews={invoiceViews} invoices={invoices.filter((item) => item.cardId === selectedCard.id)}
        onArchive={requestArchiveCard} onDeleteCard={requestDeleteCard} onEditCard={openCardForm} onEditPurchase={openEditPurchase} onPayInvoice={openPayment}
        onPurchase={openPurchase} onRemoveInvoice={requestDeleteInvoice} onRemovePayment={requestDeletePayment} onRemovePurchase={requestDeletePurchase}
        onTabChange={setActiveTab} onViewChange={updateInvoiceView} payments={payments.filter((item) => item.cardId === selectedCard.id)} purchases={purchases.filter((item) => item.cardId === selectedCard.id)} />
    ) : <CardNotFound /> : (
      <CardsOverview actionsDisabled={actionsDisabled} cards={cards} invoices={invoices} totals={totals} onArchive={requestArchiveCard} onCreate={() => openCardForm()} onDelete={requestDeleteCard} onEdit={openCardForm} onPurchase={openPurchase} />
    )}
    <CardFormModal busy={isActionPending("card:save")} editing={Boolean(editingCardId)} form={cardForm} isOpen={modal === "card"} onChange={setCardForm} onClose={() => setModal(null)} onSubmit={(event) => void handleCardSubmit(event)} />
    <PurchaseFormModal busy={isActionPending("purchase:save")} cards={cards} categories={expenseCategories} editing={Boolean(editingPurchaseId)} form={purchaseForm} isOpen={modal === "purchase"} onChange={setPurchaseForm} onClose={() => setModal(null)} onSubmit={(event) => void handlePurchaseSubmit(event)} />
    <PaymentFormModal accounts={accounts} form={paymentForm} isOpen={modal === "payment"} onChange={setPaymentForm} onClose={() => setModal(null)} onSubmit={handlePaymentSubmit} />
    <ConfirmActionModal busy={isActionPending("card:confirm")} description={confirmAction?.description} isOpen={modal === "confirm"} onClose={() => setModal(null)} onConfirm={() => void handleConfirmAction()} title={confirmAction?.title} />
  </>;
}

function emptyPurchaseForm(): CardPurchaseInput {
  const today = new Date();
  return { cardId: "", categoryId: "", description: "", amountInCents: 0, purchaseDate: today, installmentsCount: 1, firstInstallmentDate: today, idempotencyKey: crypto.randomUUID() };
}

function cardToInput(card: CreditCardType, status: CreditCardInput["status"]): CreditCardInput {
  return { name: card.name, institution: card.institution ?? "", lastFour: card.lastFour ?? "", brand: card.brand ?? "OTHER", limitInCents: card.limitInCents, closingDay: card.closingDay, dueDay: card.dueDay, color: card.color, status };
}
