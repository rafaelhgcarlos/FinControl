import { CreditCard } from "lucide-react";
import { Card } from "../../../components/Card";
import { EmptyState } from "../../../components/EmptyState";
import type { CardInvoice, CreditCard as CreditCardType } from "../../../types/creditCard";
import { formatCurrencyFromCents } from "../../../utils/money";
import { getCurrentInvoice } from "../cardViewUtils";
import { CardVisual } from "./CardVisual";

export function CardsOverview({ actionsDisabled = false, cards, invoices, totals, onArchive, onCreate, onDelete, onEdit, onPurchase }: {
  actionsDisabled?: boolean;
  cards: CreditCardType[];
  invoices: CardInvoice[];
  totals: { limitTotal: number; committed: number; available: number; accountBalance: number };
  onArchive: (card: CreditCardType) => void;
  onCreate: () => void;
  onDelete: (card: CreditCardType) => void;
  onEdit: (card: CreditCardType) => void;
  onPurchase: (cardId?: string) => void;
}) {
  return (
    <div className="space-y-5">
      <section aria-label="Resumo da carteira" className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Limite total" value={totals.limitTotal} />
        <SummaryCard label="Comprometido" value={totals.committed} />
        <SummaryCard label="Disponível" value={totals.available} />
        <SummaryCard label="Saldo em contas" value={totals.accountBalance} />
      </section>
      <section aria-label="Cartões da carteira" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <CardVisual actionsDisabled={actionsDisabled} card={card} currentInvoice={getCurrentInvoice(card, invoices)} key={card.id} onArchive={onArchive} onDelete={onDelete} onEdit={onEdit} onPurchase={onPurchase} />)}
        {cards.length === 0 ? (
          <EmptyState
            action={{ disabled: actionsDisabled, label: "Criar cartão", onClick: onCreate }}
            className="mt-0 md:col-span-2 xl:col-span-3"
            description="Cadastre um cartão para controlar limite e faturas."
            icon={<CreditCard className="h-6 w-6" aria-hidden="true" />}
            title="Nenhum cartão cadastrado"
          />
        ) : null}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <Card><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{formatCurrencyFromCents(value)}</p></Card>;
}
