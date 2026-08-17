import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CreditCard } from "lucide-react";
import { Modal } from "./Modal";

export const newEntryDestinations = {
  expense: "/app/transactions?new=1&type=EXPENSE",
  income: "/app/transactions?new=1&type=INCOME",
  cardPurchase: "/app/cards?new=purchase",
  transfer: "/app/transactions?new=1&type=TRANSFER",
} as const;

export type NewEntryDestination = (typeof newEntryDestinations)[keyof typeof newEntryDestinations];

const options = [
  { label: "Despesa", description: "Registre um gasto pago por uma conta.", icon: ArrowDownLeft, destination: newEntryDestinations.expense, tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300" },
  { label: "Receita", description: "Adicione uma entrada ao saldo de uma conta.", icon: ArrowUpRight, destination: newEntryDestinations.income, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300" },
  { label: "Compra no cartao", description: "Lance uma compra e suas parcelas na fatura.", icon: CreditCard, destination: newEntryDestinations.cardPurchase, tone: "text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-300" },
  { label: "Transferencia", description: "Movimente saldo entre duas contas.", icon: ArrowLeftRight, destination: newEntryDestinations.transfer, tone: "text-violet-600 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-300" },
] as const;

export function NewEntryLauncher({ isOpen, onClose, onSelect }: { isOpen: boolean; onClose: () => void; onSelect: (destination: NewEntryDestination) => void }) {
  return (
    <Modal
      description="Escolha o tipo de movimentacao que deseja registrar."
      isOpen={isOpen}
      onClose={onClose}
      title="Novo lancamento"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(({ description, destination, icon: Icon, label, tone }, index) => (
          <button
            autoFocus={index === 0}
            className="group flex min-h-28 items-start gap-3 rounded-lg border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/70 dark:focus-visible:ring-offset-[#111820]"
            key={destination}
            onClick={() => onSelect(destination)}
            type="button"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-slate-950 dark:text-white">{label}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
