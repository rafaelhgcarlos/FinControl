import { CreditCard, ReceiptText } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { EmptyState } from "../../../components/EmptyState";
import { Tabs, type TabItem } from "../../../components/ui/Tabs";
import type { Account } from "../../../types/account";
import type { Category } from "../../../types/category";
import type { CardInstallment, CardInvoice, CardPayment, CardPurchase, CreditCard as CreditCardType } from "../../../types/creditCard";
import { defaultInvoiceView, getCurrentInvoice, getInvoiceStatusLabel, getInvoiceStatusVariant, type InvoiceViewState } from "../cardViewUtils";
import { CardVisual } from "./CardVisual";
import { InstallmentsList, PaymentsList, PurchasesList } from "./CardActivityLists";
import { InvoiceView } from "./InvoiceView";
import { LimitUsage } from "./LimitUsage";

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
  const tabs: Array<TabItem<CardTab>> = [{ value: "invoice", label: "Faturas" }, { value: "purchases", label: "Compras" }, { value: "installments", label: "Parcelas" }, { value: "history", label: "Histórico" }];

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-3">
        <CardVisual actionsDisabled={actionsDisabled} card={card} compact currentInvoice={currentInvoice} onArchive={onArchive} onDelete={onDeleteCard} onEdit={onEditCard} onPurchase={onPurchase} />
        <Card className="space-y-4 p-3 sm:p-4"><LimitUsage card={card} /><div className="grid grid-cols-2 gap-2 text-sm"><Metric label="Fechamento" value={card.closingDay} /><Metric label="Vencimento" value={card.dueDay} /></div></Card>
      </div>
      <Card className="p-3 sm:p-5">
        <Tabs active={activeTab} ariaLabel="Seções do cartão" items={tabs} onChange={onTabChange} />
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
  return <section aria-label="Histórico de faturas"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Escolha uma fatura</p><div className="flex gap-2 overflow-x-auto pb-1">{invoices.map((invoice) => <button aria-pressed={selectedInvoiceId === invoice.id} className={`min-w-32 rounded-control border px-3 py-2 text-left text-sm ${selectedInvoiceId === invoice.id ? "border-primary bg-primary/10" : "border-border"}`} key={invoice.id} onClick={() => onSelect(invoice.id)} type="button"><span className="block font-semibold">{invoice.cycleKey}</span><Badge className="mt-1" variant={getInvoiceStatusVariant(invoice.status)}>{getInvoiceStatusLabel(invoice.status)}</Badge></button>)}</div></section>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-control bg-surface-subtle px-2 py-2"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">Dia {value}</p></div>;
}
