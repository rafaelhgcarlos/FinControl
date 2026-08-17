import { CreditCard, ReceiptText } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { EmptyState } from "../../../components/EmptyState";
import type { Account } from "../../../types/account";
import type { Category } from "../../../types/category";
import type { CardInstallment, CardInvoice, CardPayment, CardPurchase, CreditCard as CreditCardType } from "../../../types/creditCard";
import { formatCurrencyFromCents } from "../../../utils/money";
import { defaultInvoiceView, getCurrentInvoice, invoiceStatusLabel, invoiceStatusVariant, type InvoiceViewState } from "../cardViewUtils";
import { CardVisual } from "./CardVisual";
import { InstallmentsList, PaymentsList, PurchasesList } from "./CardActivityLists";
import { InvoiceView } from "./InvoiceView";

export type CardTab = "invoice" | "purchases" | "installments" | "history";

export function CardDetailView({ accounts, actionsDisabled = false, activeTab, card, categories, installments, invoiceViews, invoices, onArchive, onDeleteCard, onEditCard, onEditPurchase, onPayInvoice, onPurchase, onRemoveInvoice, onRemovePayment, onRemovePurchase, onTabChange, onViewChange, payments, purchases }: {
  accounts: Account[];
  actionsDisabled?: boolean;
  activeTab: CardTab;
  card: CreditCardType;
  categories: Category[];
  installments: CardInstallment[];
  invoiceViews: Record<string, InvoiceViewState>;
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
  onViewChange: (invoiceId: string, patch: Partial<InvoiceViewState>) => void;
  payments: CardPayment[];
  purchases: CardPurchase[];
}) {
  const initialInvoice = getCurrentInvoice(card, invoices) ?? invoices[0];
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoice?.id ?? "");
  const currentInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? initialInvoice;
  const available = card.limitInCents - card.committedLimitInCents;
  const tabs: Array<[CardTab, string]> = [["invoice", "Faturas"], ["purchases", "Compras"], ["installments", "Parcelas"], ["history", "Histórico"]];

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-3">
        <CardVisual actionsDisabled={actionsDisabled} card={card} compact currentInvoice={currentInvoice} onArchive={onArchive} onDelete={onDeleteCard} onEdit={onEditCard} onPurchase={onPurchase} />
        <Card className="p-3 sm:p-4"><div className="grid grid-cols-2 gap-2 text-sm"><Metric label="Limite" value={card.limitInCents} /><Metric label="Disponível" value={available} /><Metric format="number" label="Fechamento" value={card.closingDay} /><Metric format="number" label="Vencimento" value={card.dueDay} /></div></Card>
      </div>
      <Card className="p-3 sm:p-5">
        <div aria-label="Seções do cartão" className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3 dark:border-slate-800 sm:flex sm:overflow-x-auto" role="tablist">
          {tabs.map(([value, label]) => <button aria-selected={activeTab === value} className={`min-h-11 rounded-md px-3 py-2 text-sm font-medium ${activeTab === value ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`} key={value} onClick={() => onTabChange(value)} role="tab" type="button">{label}</button>)}
        </div>
        <div className="mt-4" role="tabpanel">
          {activeTab === "invoice" ? (
            <div className="space-y-4">
              {invoices.length > 1 ? <InvoicePicker invoices={invoices} onSelect={setSelectedInvoiceId} selectedInvoiceId={currentInvoice?.id ?? ""} /> : null}
              {currentInvoice ? <InvoiceView actionsDisabled={actionsDisabled} card={card} categories={categories} installments={installments} invoice={currentInvoice} invoiceView={invoiceViews[currentInvoice.id] ?? defaultInvoiceView} onEditPurchase={onEditPurchase} onPayInvoice={onPayInvoice} onRemoveInvoice={onRemoveInvoice} onRemovePurchase={onRemovePurchase} onViewChange={onViewChange} payments={payments.filter((payment) => payment.invoiceId === currentInvoice.id)} purchases={purchases} /> : <EmptyState action={<Button disabled={actionsDisabled} onClick={() => onPurchase(card.id)}>Registrar compra</Button>} description="Registre uma compra para criar a primeira fatura deste cartão." icon={<ReceiptText className="h-6 w-6" />} title="Nenhuma fatura" />}
            </div>
          ) : null}
          {activeTab === "purchases" ? <PurchasesList actionsDisabled={actionsDisabled} categories={categories} onEditPurchase={onEditPurchase} onPurchase={() => onPurchase(card.id)} onRemovePurchase={onRemovePurchase} purchases={purchases} /> : null}
          {activeTab === "installments" ? <InstallmentsList actionsDisabled={actionsDisabled} installments={installments} onPurchase={() => onPurchase(card.id)} /> : null}
          {activeTab === "history" ? <PaymentsList accounts={accounts} actionsDisabled={actionsDisabled} onRemovePayment={onRemovePayment} payments={payments} /> : null}
        </div>
      </Card>
    </div>
  );
}

export function CardNotFound() {
  return <Card><EmptyState action={<Button asChild><Link to="/app/cards">Voltar para cartões</Link></Button>} description="O cartão pode ter sido removido ou o endereço está incorreto." icon={<CreditCard className="h-6 w-6" />} title="Cartão não encontrado" /></Card>;
}

function InvoicePicker({ invoices, onSelect, selectedInvoiceId }: { invoices: CardInvoice[]; onSelect: (invoiceId: string) => void; selectedInvoiceId: string }) {
  return <section aria-label="Histórico de faturas"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Escolha uma fatura</p><div className="flex gap-2 overflow-x-auto pb-1">{invoices.map((invoice) => <button aria-pressed={selectedInvoiceId === invoice.id} className={`min-w-32 rounded-lg border px-3 py-2 text-left text-sm ${selectedInvoiceId === invoice.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-700"}`} key={invoice.id} onClick={() => onSelect(invoice.id)} type="button"><span className="block font-semibold">{invoice.cycleKey}</span><Badge className="mt-1" variant={invoiceStatusVariant(invoice.status)}>{invoiceStatusLabel(invoice.status)}</Badge></button>)}</div></section>;
}

function Metric({ format = "currency", label, value }: { format?: "currency" | "number"; label: string; value: number }) {
  return <div className="rounded-md bg-slate-100 px-2 py-2 dark:bg-slate-800"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold">{format === "currency" ? formatCurrencyFromCents(value) : value}</p></div>;
}
