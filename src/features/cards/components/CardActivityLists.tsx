import { Pencil, Trash2 } from "lucide-react";
import { Button } from "../../../components/Button";
import { EmptyState } from "../../../components/EmptyState";
import type { Account } from "../../../types/account";
import type { Category } from "../../../types/category";
import type { CardInstallment, CardPayment, CardPurchase } from "../../../types/creditCard";
import { formatDatePtBr } from "../../../utils/date";
import { formatCurrencyFromCents } from "../../../utils/money";

export function PurchasesList({ actionsDisabled = false, categories, onEditPurchase, onPurchase, onRemovePurchase, purchases }: {
  actionsDisabled?: boolean;
  categories: Category[];
  onEditPurchase: (purchase: CardPurchase) => void;
  onPurchase: () => void;
  onRemovePurchase: (purchase: CardPurchase) => void;
  purchases: CardPurchase[];
}) {
  if (purchases.length === 0) return <EmptyState action={<Button disabled={actionsDisabled} onClick={onPurchase}>Registrar compra</Button>} className="mt-0" description="As compras deste cartão aparecerão aqui." size="compact" title="Nenhuma compra registrada" />;
  return <div className="space-y-2">{purchases.map((purchase) => (
    <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between" key={purchase.id}>
      <div className="min-w-0"><p className="truncate font-medium">{purchase.description}</p><p className="mt-1 text-xs text-slate-500">{categoryName(categories, purchase.categoryId)} • {formatDatePtBr(purchase.purchaseDate)} • {purchase.installmentsCount}x</p></div>
      <div className="flex items-center justify-between gap-2 sm:justify-end"><span className="font-semibold">{formatCurrencyFromCents(purchase.amountInCents)}</span><Button aria-label="Editar compra" className="min-h-9 px-2" disabled={actionsDisabled} onClick={() => onEditPurchase(purchase)} variant="ghost"><Pencil className="h-4 w-4" /></Button><Button aria-label="Excluir compra" className="min-h-9 px-2" disabled={actionsDisabled} onClick={() => onRemovePurchase(purchase)} variant="ghost"><Trash2 className="h-4 w-4" /></Button></div>
    </div>
  ))}</div>;
}

export function InstallmentsList({ actionsDisabled = false, installments, onPurchase }: { actionsDisabled?: boolean; installments: CardInstallment[]; onPurchase: () => void }) {
  if (installments.length === 0) return <EmptyState action={<Button disabled={actionsDisabled} onClick={onPurchase}>Registrar compra</Button>} className="mt-0" description="Compras parceladas aparecerão nesta lista." size="compact" title="Nenhuma parcela registrada" />;
  return <div className="grid gap-2 md:grid-cols-2">{installments.slice(0, 80).map((installment) => (
    <div className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800" key={installment.id}><div className="flex justify-between gap-3"><span className="truncate font-medium">{installment.description}</span><span className="shrink-0 font-semibold">{formatCurrencyFromCents(installment.amountInCents)}</span></div><p className="mt-1 text-xs text-slate-500">Parcela {installment.installmentNumber}/{installment.installmentsCount} • {formatDatePtBr(installment.dueDate)}</p></div>
  ))}</div>;
}

export function PaymentsList({ accounts, actionsDisabled = false, onRemovePayment, payments }: { accounts: Account[]; actionsDisabled?: boolean; onRemovePayment: (payment: CardPayment) => void; payments: CardPayment[] }) {
  if (payments.length === 0) return <EmptyState className="mt-0" description="Os pagamentos aparecerão após a quitação total ou parcial de uma fatura." size="compact" title="Nenhum pagamento registrado" />;
  return <div className="space-y-2">{payments.map((payment) => {
    const account = accounts.find((item) => item.id === payment.accountId);
    return <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between" key={payment.id}><div><p className="font-medium">{account?.name ?? "Conta"}</p><p className="mt-1 text-xs text-slate-500">{formatDatePtBr(payment.paidAt)}</p></div><div className="flex items-center justify-between gap-2"><span className="font-semibold">{formatCurrencyFromCents(payment.amountInCents)}</span><Button aria-label="Remover pagamento" className="min-h-9 px-2" disabled={actionsDisabled} onClick={() => onRemovePayment(payment)} variant="ghost"><Trash2 className="h-4 w-4" /></Button></div></div>;
  })}</div>;
}

export function categoryName(categories: Category[], categoryId?: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? "Sem categoria";
}
