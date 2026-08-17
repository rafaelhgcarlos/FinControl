import { Archive, Building2, CreditCard, Pencil, Plus, ReceiptText, Trash2, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CurrencyInput } from "../components/CurrencyInput";
import { EmptyState } from "../components/EmptyState";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { LoadingState } from "../components/LoadingState";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Select } from "../components/Select";
import { Table } from "../components/Table";
import { Toast } from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";
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
  listCards,
  listCardPayments,
  listInstallments,
  listInvoices,
  listPurchases,
  payInvoice,
  updateCard,
  updateCardPurchase,
  type CardPurchaseInput,
  type CreditCardInput,
} from "../services/cardsService";
import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { CardInstallment, CardInvoice, CardPayment, CardPurchase, CreditCard as CreditCardType } from "../types/creditCard";
import { formatDatePtBr, toDateInputValue } from "../utils/date";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { formatCurrencyFromCents, parseCurrencyToCents } from "../utils/money";

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
const defaultInvoiceView = { query: "", visible: 12, sort: "date-desc" as const };
type CardTab = "invoice" | "purchases" | "installments" | "history";

export function CardsPage() {
  const { user } = useAuth();
  const { cardId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [invoices, setInvoices] = useState<CardInvoice[]>([]);
  const [installments, setInstallments] = useState<CardInstallment[]>([]);
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
  const [invoiceViews, setInvoiceViews] = useState<Record<string, { query: string; visible: number; sort: "date-desc" | "date-asc" | "amount-desc" }>>({});
  const [activeTab, setActiveTab] = useState<CardTab>("invoice");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [nextCards, nextInvoices, nextInstallments, nextPurchases, nextPayments, nextAccounts, nextCategories] = await Promise.all([
      listCards(user.uid),
      listInvoices(user.uid),
      listInstallments(user.uid),
      listPurchases(user.uid),
      listCardPayments(user.uid),
      listAccounts(user.uid),
      listCategories(user.uid),
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
      setMessage(getFriendlyFirebaseError(error, "Nao foi possivel carregar os cartoes."));
      setLoading(false);
    });
  }, [loadData]);

  const totals = useMemo(() => {
    const activeCards = cards.filter((card) => card.status === "ACTIVE");
    const limitTotal = activeCards.reduce((total, card) => total + card.limitInCents, 0);
    const committed = activeCards.reduce((total, card) => total + card.committedLimitInCents, 0);
    const accountBalance = accounts.filter((account) => account.status === "ACTIVE").reduce((total, account) => total + account.currentBalanceInCents, 0);
    return { limitTotal, committed, available: limitTotal - committed, accountBalance };
  }, [accounts, cards]);

  const selectedCard = useMemo(() => cards.find((card) => card.id === cardId), [cardId, cards]);
  const expenseCategories = useMemo(() => categories.filter((category) => category.type === "EXPENSE" && category.status === "ACTIVE"), [categories]);

  useEffect(() => {
    if (!loading && searchParams.get("new") === "purchase") {
      setEditingPurchaseId(null);
      setPurchaseForm({ ...emptyPurchaseForm(), cardId: cards.find((card) => card.status === "ACTIVE")?.id ?? "" });
      setModal("purchase");
      setSearchParams({}, { replace: true });
    }
  }, [cards, loading, searchParams, setSearchParams]);

  function openCardForm(card?: CreditCardType) {
    setEditingCardId(card?.id ?? null);
    setCardForm(card ? {
      name: card.name,
      institution: card.institution ?? "",
      lastFour: card.lastFour ?? "",
      brand: card.brand ?? "OTHER",
      limitInCents: card.limitInCents,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      color: card.color,
      status: card.status,
    } : initialCardForm);
    setModal("card");
  }

  function openPurchase(cardId?: string) {
    setEditingPurchaseId(null);
    setPurchaseForm({ ...emptyPurchaseForm(), cardId: cardId ?? cards.find((card) => card.status === "ACTIVE")?.id ?? "" });
    setModal("purchase");
  }

  function openEditPurchase(purchase: CardPurchase) {
    setEditingPurchaseId(purchase.id);
    setPurchaseForm({
      cardId: purchase.cardId,
      categoryId: purchase.categoryId,
      description: purchase.description,
      amountInCents: purchase.amountInCents,
      purchaseDate: purchase.purchaseDate,
      installmentsCount: purchase.installmentsCount,
      firstInstallmentDate: purchase.firstInstallmentDate,
      idempotencyKey: purchase.idempotencyKey,
    });
    setModal("purchase");
  }

  function openPayment(invoice: CardInvoice) {
    setPaymentForm({
      invoiceId: invoice.id,
      accountId: accounts.find((account) => account.status === "ACTIVE")?.id ?? "",
      amountInCents: invoice.totalInCents - invoice.paidInCents,
    });
    setModal("payment");
  }

  async function handleCardSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    try {
      if (editingCardId) {
        await updateCard(editingCardId, cardForm);
        setMessage("Cartao atualizado.");
      } else {
        await createCard(user.uid, cardForm);
        setMessage("Cartao criado.");
      }
      setCardForm(initialCardForm);
      setEditingCardId(null);
      setModal(null);
      await loadData();
    } catch (error) {
      setMessage(getFriendlyFirebaseError(error, "Nao foi possivel salvar o cartao."));
    }
  }

  async function handlePurchaseSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    try {
      if (editingPurchaseId) {
        await updateCardPurchase(user.uid, editingPurchaseId, purchaseForm, cards, expenseCategories);
        setMessage("Compra atualizada.");
      } else {
        await createCardPurchase(user.uid, purchaseForm, cards, expenseCategories);
        setMessage("Compra registrada.");
      }
      setEditingPurchaseId(null);
      setModal(null);
      await loadData();
    } catch (error) {
      setMessage(getFriendlyFirebaseError(error, "Nao foi possivel registrar a compra."));
    }
  }

  async function handlePaymentSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const invoice = invoices.find((item) => item.id === paymentForm.invoiceId);
    const account = accounts.find((item) => item.id === paymentForm.accountId);
    setConfirmAction({
      title: "Confirmar pagamento",
      description: `Pagar ${formatCurrencyFromCents(paymentForm.amountInCents)} da fatura ${invoice?.cycleKey ?? ""} usando ${account?.name ?? "a conta selecionada"}? O valor sera descontado da conta e o limite sera liberado.`,
      action: async () => {
        await payInvoice(user.uid, paymentForm.invoiceId, paymentForm.accountId, paymentForm.amountInCents, accounts);
        setMessage("Pagamento registrado.");
        await loadData();
      },
    });
    setModal("confirm");
  }

  function requestArchiveCard(card: CreditCardType) {
    setConfirmAction({
      title: "Arquivar cartao",
      description: `Arquivar "${card.name}" impede novas compras, mas preserva faturas, parcelas e historico.`,
      action: async () => {
        if (!user) return;
        await archiveCard(user.uid, card.id);
        setMessage("Cartao arquivado.");
        await loadData();
      },
    });
    setModal("confirm");
  }

  function requestDeleteCard(card: CreditCardType) {
    setConfirmAction({
      title: "Apagar cartao",
      description: `Apagar "${card.name}" remove o cartao da carteira. Esta acao so sera permitida se ele nao tiver compras, faturas, parcelas ou pagamentos. Para cartoes com historico, use Arquivar.`,
      action: async () => {
        if (!user) return;
        await deleteUnusedCard(user.uid, card.id);
        setMessage("Cartao apagado.");
        await loadData();
      },
    });
    setModal("confirm");
  }

  function requestDeletePurchase(purchase: CardPurchase) {
    setConfirmAction({
      title: "Excluir compra",
      description: `Excluir "${purchase.description}" remove as parcelas abertas, corrige faturas e libera o limite comprometido. Faturas pagas nao podem ser alteradas.`,
      action: async () => {
        if (!user) return;
        await deleteCardPurchase(user.uid, purchase.id);
        setMessage("Compra excluida.");
        await loadData();
      },
    });
    setModal("confirm");
  }

  function requestDeleteInvoice(invoice: CardInvoice) {
    setConfirmAction({
      title: "Excluir fatura",
      description: "Esta acao remove a fatura e as compras vinculadas a ela, corrige parcelas, faturas futuras e libera o limite. Faturas pagas nao podem ser excluidas.",
      action: async () => {
        if (!user) return;
        await deleteCardInvoice(user.uid, invoice.id);
        setMessage("Fatura excluida.");
        await loadData();
      },
    });
    setModal("confirm");
  }

  function requestDeletePayment(payment: CardPayment) {
    setConfirmAction({
      title: "Remover pagamento",
      description: `Remover o pagamento de ${formatCurrencyFromCents(payment.amountInCents)}? O saldo voltara para a conta, a fatura sera reaberta e o limite do cartao sera comprometido novamente.`,
      action: async () => {
        if (!user) return;
        await deleteCardPayment(user.uid, payment.id);
        setMessage("Pagamento removido.");
        await loadData();
      },
    });
    setModal("confirm");
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    try {
      await confirmAction.action();
      setConfirmAction(null);
      setModal(null);
    } catch (error) {
      setMessage(getFriendlyFirebaseError(error, "Nao foi possivel concluir a acao."));
    }
  }

  function updateInvoiceView(invoiceId: string, patch: Partial<{ query: string; visible: number; sort: "date-desc" | "date-asc" | "amount-desc" }>) {
    setInvoiceViews((current) => ({
      ...current,
      [invoiceId]: { ...defaultInvoiceView, ...current[invoiceId], ...patch },
    }));
  }

  return (
    <>
      <PageHeader
        title={selectedCard ? selectedCard.name : "Cartões"}
        description={selectedCard ? "Fatura atual, compras, parcelas e historico do cartao selecionado." : "Controle seus cartoes sem misturar faturas de bancos diferentes."}
        action={<div className="flex flex-wrap gap-2">{selectedCard ? <Button asChild variant="secondary"><Link to="/app/cards">Voltar</Link></Button> : null}<Button onClick={() => openCardForm(selectedCard)}><Plus className="h-4 w-4" aria-hidden="true" />{selectedCard ? "Editar cartao" : "Novo cartao"}</Button>{selectedCard ? <Button variant="secondary" onClick={() => openPurchase(selectedCard.id)}><ReceiptText className="h-4 w-4" aria-hidden="true" />Nova compra</Button> : null}</div>}
      />
      {message ? <div className="mb-4"><Toast>{message}</Toast></div> : null}
      {loading ? <LoadingState label="Carregando cartoes" /> : (
        <div className="space-y-5">
          {!selectedCard ? <section className="grid gap-3 md:grid-cols-4">
            <SummaryCard label="Limite total" value={totals.limitTotal} />
            <SummaryCard label="Comprometido" value={totals.committed} />
            <SummaryCard label="Disponivel" value={totals.available} />
            <SummaryCard label="Saldo em contas" value={totals.accountBalance} />
          </section> : null}

          {!selectedCard ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => <CreditCardPanel key={card.id} card={card} currentInvoice={getCurrentInvoice(card, invoices)} onArchive={requestArchiveCard} onDelete={requestDeleteCard} onEdit={openCardForm} onPurchase={openPurchase} />)}
              {cards.length === 0 ? <EmptyState title="Nenhum cartao cadastrado" description="Cadastre um cartao para controlar limite e faturas." icon={<CreditCard className="h-6 w-6" aria-hidden="true" />} /> : null}
            </section>
          ) : (
            <CardDetail
              accounts={accounts}
              activeTab={activeTab}
              card={selectedCard}
              categories={categories}
              installments={installments.filter((installment) => installment.cardId === selectedCard.id)}
              invoiceViews={invoiceViews}
              invoices={invoices.filter((invoice) => invoice.cardId === selectedCard.id)}
              onArchive={requestArchiveCard}
              onDeleteCard={requestDeleteCard}
              onEditCard={openCardForm}
              onEditPurchase={openEditPurchase}
              onPayInvoice={openPayment}
              onPurchase={openPurchase}
              onRemoveInvoice={requestDeleteInvoice}
              onRemovePayment={requestDeletePayment}
              onRemovePurchase={requestDeletePurchase}
              onTabChange={setActiveTab}
              onViewChange={updateInvoiceView}
              payments={payments.filter((payment) => payment.cardId === selectedCard.id)}
              purchases={purchases.filter((purchase) => purchase.cardId === selectedCard.id)}
            />
          )}
        </div>
      )}

      <Modal isOpen={modal === "card"} title={editingCardId ? "Editar cartao" : "Novo cartao"} onClose={() => setModal(null)}>
        <form className="grid gap-4" onSubmit={(event) => void handleCardSubmit(event)}>
          <FormField id="card-name" label="Nome"><Input id="card-name" required value={cardForm.name} onChange={(event) => setCardForm({ ...cardForm, name: event.target.value })} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="card-bank" label="Banco/instituicao"><Input id="card-bank" value={cardForm.institution} onChange={(event) => setCardForm({ ...cardForm, institution: event.target.value })} /></FormField>
            <FormField id="card-last-four" label="Final do cartao"><Input id="card-last-four" inputMode="numeric" maxLength={4} value={cardForm.lastFour} onChange={(event) => setCardForm({ ...cardForm, lastFour: event.target.value.replace(/\D/g, "").slice(0, 4) })} /></FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="card-limit" label="Limite"><CurrencyInput id="card-limit" value={formatCurrencyFromCents(cardForm.limitInCents)} onChange={(event) => setCardForm({ ...cardForm, limitInCents: parseCurrencyToCents(event.target.value) })} /></FormField>
            <FormField id="card-brand" label="Bandeira"><Select id="card-brand" value={cardForm.brand ?? "OTHER"} onChange={(event) => setCardForm({ ...cardForm, brand: event.target.value as CreditCardInput["brand"] })}><option value="OTHER">Outra</option><option value="VISA">Visa</option><option value="MASTERCARD">Mastercard</option><option value="ELO">Elo</option><option value="AMEX">American Express</option><option value="HIPERCARD">Hipercard</option></Select></FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField id="closing-day" label="Fechamento"><Input id="closing-day" min={1} max={31} type="number" value={cardForm.closingDay} onChange={(event) => setCardForm({ ...cardForm, closingDay: Number(event.target.value) })} /></FormField>
            <FormField id="due-day" label="Vencimento"><Input id="due-day" min={1} max={31} type="number" value={cardForm.dueDay} onChange={(event) => setCardForm({ ...cardForm, dueDay: Number(event.target.value) })} /></FormField>
            <FormField id="card-color" label="Cor"><Input id="card-color" type="color" value={cardForm.color} onChange={(event) => setCardForm({ ...cardForm, color: event.target.value })} /></FormField>
            <FormField id="card-status" label="Status"><Select id="card-status" value={cardForm.status} onChange={(event) => setCardForm({ ...cardForm, status: event.target.value as CreditCardInput["status"] })}><option value="ACTIVE">Ativo</option><option value="ARCHIVED">Arquivado</option></Select></FormField>
          </div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
        </form>
      </Modal>

      <Modal isOpen={modal === "purchase"} title={editingPurchaseId ? "Editar compra" : "Nova compra no cartao"} onClose={() => setModal(null)}>
        <form className="grid gap-4" onSubmit={(event) => void handlePurchaseSubmit(event)}>
          <FormField id="purchase-card" label="Cartao"><Select disabled={Boolean(editingPurchaseId)} id="purchase-card" required value={purchaseForm.cardId} onChange={(event) => setPurchaseForm({ ...purchaseForm, cardId: event.target.value })}><option value="">Selecione</option>{cards.filter((card) => card.status === "ACTIVE" || card.id === purchaseForm.cardId).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</Select></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="purchase-description" label="Descricao"><Input id="purchase-description" required value={purchaseForm.description} onChange={(event) => setPurchaseForm({ ...purchaseForm, description: event.target.value })} /></FormField>
            <FormField id="purchase-category" label="Categoria"><Select id="purchase-category" required value={purchaseForm.categoryId ?? ""} onChange={(event) => setPurchaseForm({ ...purchaseForm, categoryId: event.target.value })}><option value="">Selecione</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="purchase-amount" label="Valor total"><CurrencyInput id="purchase-amount" value={formatCurrencyFromCents(purchaseForm.amountInCents)} onChange={(event) => setPurchaseForm({ ...purchaseForm, amountInCents: parseCurrencyToCents(event.target.value) })} /></FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="purchase-date" label="Data"><Input id="purchase-date" type="date" value={toDateInputValue(purchaseForm.purchaseDate)} onChange={(event) => setPurchaseForm({ ...purchaseForm, purchaseDate: new Date(`${event.target.value}T12:00:00`) })} /></FormField>
            <FormField id="installments" label="Parcelas"><Input id="installments" min={1} max={48} type="number" value={purchaseForm.installmentsCount} onChange={(event) => setPurchaseForm({ ...purchaseForm, installmentsCount: Number(event.target.value) })} /></FormField>
            <FormField id="first-installment" label="Primeira parcela"><Input id="first-installment" type="date" value={toDateInputValue(purchaseForm.firstInstallmentDate)} onChange={(event) => setPurchaseForm({ ...purchaseForm, firstInstallmentDate: new Date(`${event.target.value}T12:00:00`) })} /></FormField>
          </div>
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Parcela estimada: <strong>{formatCurrencyFromCents(purchaseForm.installmentsCount > 0 ? Math.round(purchaseForm.amountInCents / purchaseForm.installmentsCount) : 0)}</strong></div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button type="submit">{editingPurchaseId ? "Salvar" : "Registrar"}</Button></div>
        </form>
      </Modal>

      <Modal isOpen={modal === "payment"} title="Pagar fatura" onClose={() => setModal(null)}>
        <form className="grid gap-4" onSubmit={(event) => void handlePaymentSubmit(event)}>
          <FormField id="payment-account" label="Conta de pagamento"><Select id="payment-account" required value={paymentForm.accountId} onChange={(event) => setPaymentForm({ ...paymentForm, accountId: event.target.value })}><option value="">Selecione</option>{accounts.filter((account) => account.status === "ACTIVE").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></FormField>
          <FormField id="payment-amount" label="Valor"><CurrencyInput id="payment-amount" value={formatCurrencyFromCents(paymentForm.amountInCents)} onChange={(event) => setPaymentForm({ ...paymentForm, amountInCents: parseCurrencyToCents(event.target.value) })} /></FormField>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button type="submit">Pagar</Button></div>
        </form>
      </Modal>

      <Modal isOpen={modal === "confirm"} title={confirmAction?.title ?? "Confirmar acao"} description={confirmAction?.description} onClose={() => setModal(null)}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => void handleConfirmAction()}>Confirmar</Button>
        </div>
      </Modal>
    </>
  );
}

function emptyPurchaseForm(): CardPurchaseInput {
  const today = new Date();
  return {
    cardId: "",
    categoryId: "",
    description: "",
    amountInCents: 0,
    purchaseDate: today,
    installmentsCount: 1,
    firstInstallmentDate: today,
    idempotencyKey: crypto.randomUUID(),
  };
}

function CreditCardPanel({ card, compact = false, currentInvoice, onArchive, onDelete, onEdit, onPurchase }: {
  card: CreditCardType;
  compact?: boolean;
  currentInvoice?: CardInvoice;
  onArchive: (card: CreditCardType) => void;
  onDelete: (card: CreditCardType) => void;
  onEdit: (card: CreditCardType) => void;
  onPurchase: (cardId?: string) => void;
}) {
  const available = card.limitInCents - card.committedLimitInCents;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Link className="block" to={`/app/cards/${card.id}`}>
        <div className={`relative p-5 text-white ${compact ? "min-h-44 sm:min-h-52" : "min-h-56"}`} style={{ background: `linear-gradient(135deg, ${card.color}, #0f172a)` }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_30%),linear-gradient(120deg,rgba(255,255,255,0.12),transparent_45%)]" />
          <div className="relative flex items-start justify-between">
            <BankLogo institution={card.institution} />
            <Badge className="bg-white/15 text-white ring-white/25">{card.status === "ACTIVE" ? "Ativo" : "Arquivado"}</Badge>
          </div>
          <div className={`relative ${compact ? "mt-6" : "mt-9"}`}>
            <p className="text-xs uppercase text-white/65">Credito</p>
            <p className="mt-1 truncate text-xl font-semibold">{card.name}</p>
            <p className="mt-1 text-sm text-white/75">{card.institution || "Instituicao nao informada"} • final {card.lastFour ?? "----"}</p>
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-white/65">Disponivel</p><p className="font-semibold">{formatCurrencyFromCents(available)}</p></div>
            <div><p className="text-white/65">Fatura atual</p><p className="font-semibold">{formatCurrencyFromCents(currentInvoice?.totalInCents ?? 0)}</p></div>
          </div>
          <div className="relative mt-4 flex items-end justify-between gap-3">
            <p className="text-xs text-white/70">Vence dia {card.dueDay}</p>
            <CardBrandMark brand={card.brand} />
          </div>
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-4">
        <Button className="px-2" disabled={card.status !== "ACTIVE"} onClick={() => onPurchase(card.id)} variant="secondary">Compra</Button>
        <Button className="px-2" onClick={() => onEdit(card)} variant="ghost"><Pencil className="h-4 w-4" aria-hidden="true" />Editar</Button>
        <Button className="px-2" disabled={card.status === "ARCHIVED"} onClick={() => onArchive(card)} variant="ghost"><Archive className="h-4 w-4" aria-hidden="true" />Arquivar</Button>
        <Button className="px-2" onClick={() => onDelete(card)} variant="danger"><Trash2 className="h-4 w-4" aria-hidden="true" />Apagar</Button>
      </div>
    </div>
  );
}

function CardDetail({ accounts, activeTab, card, categories, installments, invoiceViews, invoices, onArchive, onDeleteCard, onEditCard, onEditPurchase, onPayInvoice, onPurchase, onRemoveInvoice, onRemovePayment, onRemovePurchase, onTabChange, onViewChange, payments, purchases }: {
  accounts: Account[];
  activeTab: CardTab;
  card: CreditCardType;
  categories: Category[];
  installments: CardInstallment[];
  invoiceViews: Record<string, { query: string; visible: number; sort: "date-desc" | "date-asc" | "amount-desc" }>;
  invoices: CardInvoice[];
  onArchive: (card: CreditCardType) => void;
  onDeleteCard: (card: CreditCardType) => void;
  onEditCard: (card: CreditCardType) => void;
  onEditPurchase: (purchase: CardPurchase) => void;
  onPayInvoice: (invoice: CardInvoice) => void;
  onPurchase: (cardId?: string) => void;
  onRemoveInvoice: (invoice: CardInvoice) => void;
  onRemovePayment: (payment: CardPayment) => void;
  onRemovePurchase: (purchase: CardPurchase) => void;
  onTabChange: (tab: CardTab) => void;
  onViewChange: (invoiceId: string, patch: Partial<{ query: string; visible: number; sort: "date-desc" | "date-asc" | "amount-desc" }>) => void;
  payments: CardPayment[];
  purchases: CardPurchase[];
}) {
  const currentInvoice = getCurrentInvoice(card, invoices) ?? invoices[0];
  const available = card.limitInCents - card.committedLimitInCents;
  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-3">
        <CreditCardPanel card={card} compact currentInvoice={currentInvoice} onArchive={onArchive} onDelete={onDeleteCard} onEdit={onEditCard} onPurchase={onPurchase} />
        <Card className="p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-2">
            <Metric label="Limite" value={card.limitInCents} />
            <Metric label="Disponivel" value={available} />
            <Metric label="Fechamento" value={card.closingDay} format="number" />
            <Metric label="Vencimento" value={card.dueDay} format="number" />
          </div>
        </Card>
      </div>
      <Card className="p-3 sm:p-5">
        <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3 dark:border-slate-800 sm:flex sm:overflow-x-auto">
          {[
            ["invoice", "Fatura atual"],
            ["purchases", "Compras"],
            ["installments", "Parcelas"],
            ["history", "Historico"],
          ].map(([value, label]) => (
            <button key={value} className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium ${activeTab === value ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`} onClick={() => onTabChange(value as CardTab)} type="button">{label}</button>
          ))}
        </div>
        <div className="mt-4">
          {activeTab === "invoice" && currentInvoice ? <InvoicePanel accounts={accounts} card={card} categories={categories} installments={installments} invoice={currentInvoice} invoiceView={invoiceViews[currentInvoice.id] ?? defaultInvoiceView} onEditPurchase={onEditPurchase} onPayInvoice={onPayInvoice} onRemoveInvoice={onRemoveInvoice} onRemovePurchase={onRemovePurchase} onViewChange={onViewChange} payments={payments.filter((payment) => payment.invoiceId === currentInvoice.id)} purchases={purchases} /> : null}
          {activeTab === "invoice" && !currentInvoice ? <EmptyState title="Nenhuma fatura" description="Registre uma compra para criar a primeira fatura deste cartao." icon={<WalletCards className="h-6 w-6" aria-hidden="true" />} /> : null}
          {activeTab === "purchases" ? <PurchasesPanel categories={categories} onEditPurchase={onEditPurchase} onRemovePurchase={onRemovePurchase} purchases={purchases} /> : null}
          {activeTab === "installments" ? <InstallmentsPanel installments={installments} /> : null}
          {activeTab === "history" ? <PaymentsPanel accounts={accounts} onRemovePayment={onRemovePayment} payments={payments} /> : null}
        </div>
      </Card>
    </div>
  );
}

function InvoicePanel({ card, categories, installments, invoice, invoiceView, onEditPurchase, onPayInvoice, onRemoveInvoice, onRemovePurchase, onViewChange, payments, purchases }: {
  accounts: Account[];
  card: CreditCardType;
  categories: Category[];
  installments: CardInstallment[];
  invoice: CardInvoice;
  invoiceView: { query: string; visible: number; sort: "date-desc" | "date-asc" | "amount-desc" };
  onEditPurchase: (purchase: CardPurchase) => void;
  onPayInvoice: (invoice: CardInvoice) => void;
  onRemoveInvoice: (invoice: CardInvoice) => void;
  onRemovePurchase: (purchase: CardPurchase) => void;
  onViewChange: (invoiceId: string, patch: Partial<{ query: string; visible: number; sort: "date-desc" | "date-asc" | "amount-desc" }>) => void;
  payments: CardPayment[];
  purchases: CardPurchase[];
}) {
  const remaining = invoice.totalInCents - invoice.paidInCents;
  const items = buildInvoiceItems(invoice, installments, purchases, invoiceView.query, invoiceView.sort);
  const visibleItems = items.slice(0, invoiceView.visible);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Total" value={invoice.totalInCents} />
        <Metric label="Aberto" value={remaining} />
        <Metric label="Disponivel" value={card.limitInCents - card.committedLimitInCents} />
        <Metric label="Itens" value={items.length} format="number" />
      </div>
      <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Vence {formatDatePtBr(invoice.dueDate)}</p>
          <p className="mt-1 text-sm text-slate-500">Status: {invoice.status} • {payments.length} pagamento(s)</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button disabled={remaining <= 0} onClick={() => onPayInvoice(invoice)}>Pagar</Button>
          <Button disabled={invoice.paidInCents > 0 || invoice.status === "PAID"} onClick={() => onRemoveInvoice(invoice)} variant="danger">Excluir</Button>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
        <Input aria-label="Buscar item da fatura" placeholder="Buscar item" value={invoiceView.query} onChange={(event) => onViewChange(invoice.id, { query: event.target.value, visible: 12 })} />
        <Select aria-label="Ordenar itens" value={invoiceView.sort} onChange={(event) => onViewChange(invoice.id, { sort: event.target.value as typeof invoiceView.sort })}>
          <option value="date-desc">Mais recentes</option>
          <option value="date-asc">Mais antigas</option>
          <option value="amount-desc">Maior valor</option>
        </Select>
      </div>
      <div className="hidden md:block">
        <Table>
          <thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800"><th className="px-3 py-2">Descricao</th><th className="px-3 py-2">Categoria</th><th className="px-3 py-2">Data</th><th className="px-3 py-2">Parcela</th><th className="px-3 py-2">Valor</th><th className="px-3 py-2">Acoes</th></tr></thead>
          <tbody>{visibleItems.map(({ installment, purchase }) => <InvoiceItemRow key={installment.id} categories={categories} installment={installment} invoice={invoice} onEditPurchase={onEditPurchase} onRemovePurchase={onRemovePurchase} purchase={purchase} />)}</tbody>
        </Table>
      </div>
      <div className="space-y-2 md:hidden">{visibleItems.map(({ installment, purchase }) => <InvoiceItemCard key={installment.id} categories={categories} installment={installment} invoice={invoice} onEditPurchase={onEditPurchase} onRemovePurchase={onRemovePurchase} purchase={purchase} />)}</div>
      {items.length > visibleItems.length ? <Button className="w-full" onClick={() => onViewChange(invoice.id, { visible: invoiceView.visible + 20 })} variant="secondary">Mostrar mais</Button> : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{formatCurrencyFromCents(value)}</p>
    </Card>
  );
}

function InvoiceItemRow({ categories, installment, invoice, onEditPurchase, onRemovePurchase, purchase }: InvoiceItemProps) {
  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <td className="px-3 py-3 font-medium">{installment.description}</td>
      <td className="px-3 py-3">{getCategoryName(categories, installment.categoryId ?? purchase?.categoryId)}</td>
      <td className="px-3 py-3">{purchase ? formatDatePtBr(purchase.purchaseDate) : formatDatePtBr(installment.dueDate)}</td>
      <td className="px-3 py-3">{installment.installmentNumber}/{installment.installmentsCount}</td>
      <td className="px-3 py-3 font-semibold">{formatCurrencyFromCents(installment.amountInCents)}</td>
      <td className="px-3 py-3">
        <div className="flex gap-1">
          {purchase ? <Button aria-label="Editar item" className="min-h-9 px-2" disabled={invoice.paidInCents > 0} onClick={() => onEditPurchase(purchase)} variant="ghost"><Pencil className="h-4 w-4" aria-hidden="true" /></Button> : null}
          {purchase ? <Button aria-label="Excluir item" className="min-h-9 px-2" disabled={invoice.paidInCents > 0} onClick={() => onRemovePurchase(purchase)} variant="ghost"><Trash2 className="h-4 w-4" aria-hidden="true" /></Button> : null}
        </div>
      </td>
    </tr>
  );
}

function InvoiceItemCard({ categories, installment, invoice, onEditPurchase, onRemovePurchase, purchase }: InvoiceItemProps) {
  return (
    <div className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{installment.description}</p>
          <p className="mt-1 text-xs text-slate-500">{getCategoryName(categories, installment.categoryId ?? purchase?.categoryId)} • {purchase ? formatDatePtBr(purchase.purchaseDate) : formatDatePtBr(installment.dueDate)}</p>
          <p className="mt-1 text-xs text-slate-500">Parcela {installment.installmentNumber}/{installment.installmentsCount}</p>
        </div>
        <p className="shrink-0 font-semibold">{formatCurrencyFromCents(installment.amountInCents)}</p>
      </div>
      <div className="mt-3 flex justify-end gap-1">
        {purchase ? <Button aria-label="Editar item" className="min-h-9 px-2" disabled={invoice.paidInCents > 0} onClick={() => onEditPurchase(purchase)} variant="ghost"><Pencil className="h-4 w-4" aria-hidden="true" /></Button> : null}
        {purchase ? <Button aria-label="Excluir item" className="min-h-9 px-2" disabled={invoice.paidInCents > 0} onClick={() => onRemovePurchase(purchase)} variant="ghost"><Trash2 className="h-4 w-4" aria-hidden="true" /></Button> : null}
      </div>
    </div>
  );
}

type InvoiceItemProps = {
  categories: Category[];
  installment: CardInstallment;
  invoice: CardInvoice;
  onEditPurchase: (purchase: CardPurchase) => void;
  onRemovePurchase: (purchase: CardPurchase) => void;
  purchase?: CardPurchase;
};

function PurchasesPanel({ categories, onEditPurchase, onRemovePurchase, purchases }: { categories: Category[]; onEditPurchase: (purchase: CardPurchase) => void; onRemovePurchase: (purchase: CardPurchase) => void; purchases: CardPurchase[] }) {
  if (purchases.length === 0) return <p className="text-sm text-slate-500">Nenhuma compra registrada.</p>;
  return (
    <div className="space-y-2">
      {purchases.map((purchase) => (
        <div key={purchase.id} className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{purchase.description}</p>
            <p className="mt-1 text-xs text-slate-500">{getCategoryName(categories, purchase.categoryId)} • {formatDatePtBr(purchase.purchaseDate)} • {purchase.installmentsCount}x</p>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="font-semibold">{formatCurrencyFromCents(purchase.amountInCents)}</span>
            <Button className="min-h-9 px-2" onClick={() => onEditPurchase(purchase)} variant="ghost"><Pencil className="h-4 w-4" aria-hidden="true" /></Button>
            <Button className="min-h-9 px-2" onClick={() => onRemovePurchase(purchase)} variant="ghost"><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function InstallmentsPanel({ installments }: { installments: CardInstallment[] }) {
  if (installments.length === 0) return <p className="text-sm text-slate-500">Nenhuma parcela registrada.</p>;
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {installments.slice(0, 80).map((installment) => (
        <div key={installment.id} className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
          <div className="flex justify-between gap-3"><span className="truncate font-medium">{installment.description}</span><span className="shrink-0 font-semibold">{formatCurrencyFromCents(installment.amountInCents)}</span></div>
          <p className="mt-1 text-xs text-slate-500">Parcela {installment.installmentNumber}/{installment.installmentsCount} • {formatDatePtBr(installment.dueDate)}</p>
        </div>
      ))}
    </div>
  );
}

function PaymentsPanel({ accounts, onRemovePayment, payments }: { accounts: Account[]; onRemovePayment: (payment: CardPayment) => void; payments: CardPayment[] }) {
  if (payments.length === 0) return <p className="text-sm text-slate-500">Nenhum pagamento registrado.</p>;
  return (
    <div className="space-y-2">
      {payments.map((payment) => {
        const account = accounts.find((item) => item.id === payment.accountId);
        return (
          <div key={payment.id} className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium">{account?.name ?? "Conta"}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDatePtBr(payment.paidAt)}</p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <span className="shrink-0 font-semibold">{formatCurrencyFromCents(payment.amountInCents)}</span>
              <Button aria-label="Remover pagamento" className="min-h-9 px-2" onClick={() => onRemovePayment(payment)} variant="ghost"><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getCategoryName(categories: Category[], categoryId?: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? "Sem categoria";
}

function getCurrentInvoice(card: CreditCardType, invoices: CardInvoice[]) {
  return invoices
    .filter((invoice) => invoice.cardId === card.id && invoice.status !== "PAID")
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())[0];
}

function buildInvoiceItems(
  invoice: CardInvoice,
  installments: CardInstallment[],
  purchases: CardPurchase[],
  query: string,
  sort: "date-desc" | "date-asc" | "amount-desc",
) {
  const normalizedQuery = query.trim().toLowerCase();
  return installments
    .filter((installment) => installment.invoiceId === invoice.id)
    .map((installment) => ({
      installment,
      purchase: purchases.find((item) => item.id === installment.purchaseId),
    }))
    .filter(({ installment, purchase }) => {
      if (!normalizedQuery) return true;
      return installment.description.toLowerCase().includes(normalizedQuery)
        || purchase?.description.toLowerCase().includes(normalizedQuery)
        || formatCurrencyFromCents(installment.amountInCents).includes(normalizedQuery);
    })
    .sort((left, right) => {
      if (sort === "amount-desc") return right.installment.amountInCents - left.installment.amountInCents;
      const leftDate = left.purchase?.purchaseDate ?? left.installment.dueDate;
      const rightDate = right.purchase?.purchaseDate ?? right.installment.dueDate;
      return sort === "date-asc" ? leftDate.getTime() - rightDate.getTime() : rightDate.getTime() - leftDate.getTime();
    });
}

function BankLogo({ institution }: { institution?: string }) {
  const bank = getBankLogo(institution);
  return (
    <div className={`flex h-11 min-w-11 items-center justify-center rounded-md px-2 font-semibold shadow-sm ring-1 ring-white/25 ${bank?.className ?? "bg-white/15 text-white"}`}>
      {bank ? <span aria-label={`Logo ${bank.name}`} className="text-sm">{bank.mark}</span> : <Building2 className="h-6 w-6 text-white" aria-hidden="true" />}
    </div>
  );
}

function CardBrandMark({ brand = "OTHER" }: { brand?: CreditCardType["brand"] }) {
  if (brand === "MASTERCARD") {
    return (
      <div aria-label="Mastercard" className="relative h-8 w-12">
        <span className="absolute left-2 top-1 h-6 w-6 rounded-full bg-red-500/95" />
        <span className="absolute right-2 top-1 h-6 w-6 rounded-full bg-amber-400/95 mix-blend-screen" />
      </div>
    );
  }
  const marks = {
    VISA: { label: "Visa", text: "VISA", className: "bg-white text-blue-700 italic tracking-wide" },
    ELO: { label: "Elo", text: "elo", className: "bg-white text-slate-950" },
    AMEX: { label: "American Express", text: "AMEX", className: "bg-sky-500 text-white" },
    HIPERCARD: { label: "Hipercard", text: "Hiper", className: "bg-red-600 text-white" },
    OTHER: { label: "Bandeira", text: "CARD", className: "bg-white/15 text-white ring-1 ring-white/25" },
  } as const;
  const mark = marks[brand ?? "OTHER"];
  return <span aria-label={mark.label} className={`rounded px-2 py-1 text-xs font-bold ${mark.className}`}>{mark.text}</span>;
}

function getBankLogo(institution?: string) {
  const normalized = institution?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";
  if (normalized.includes("nubank")) return { name: "Nubank", mark: "Nu", className: "bg-violet-700 text-white" };
  if (normalized.includes("itau")) return { name: "Itau", mark: "Itau", className: "bg-orange-500 text-blue-900" };
  if (normalized.includes("bradesco")) return { name: "Bradesco", mark: "B", className: "bg-red-600 text-white" };
  if (normalized.includes("santander")) return { name: "Santander", mark: "S", className: "bg-red-600 text-white" };
  if (normalized.includes("inter")) return { name: "Inter", mark: "Inter", className: "bg-orange-500 text-white" };
  if (normalized.includes("c6")) return { name: "C6 Bank", mark: "C6", className: "bg-zinc-950 text-white" };
  if (normalized.includes("caixa")) return { name: "Caixa", mark: "CAIXA", className: "bg-blue-700 text-white" };
  if (normalized.includes("brasil")) return { name: "Banco do Brasil", mark: "BB", className: "bg-yellow-400 text-blue-900" };
  if (normalized.includes("xp")) return { name: "XP", mark: "XP", className: "bg-black text-yellow-400" };
  return null;
}

function Metric({ format = "currency", label, value }: { format?: "currency" | "number"; label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-100 px-2 py-2 dark:bg-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{format === "currency" ? formatCurrencyFromCents(value) : value}</p>
    </div>
  );
}
