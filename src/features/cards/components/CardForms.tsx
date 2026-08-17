import { useState, type FormEvent } from "react";
import { Button } from "../../../components/Button";
import { CurrencyInput } from "../../../components/CurrencyInput";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { Modal } from "../../../components/Modal";
import { Select } from "../../../components/Select";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import type { CardPurchaseInput, CreditCardInput } from "../services/cardsService";
import type { Account } from "../../../types/account";
import type { Category } from "../../../types/category";
import type { CreditCard } from "../../../types/creditCard";
import { toDateInputValue } from "../../../utils/date";
import { formatCurrencyFromCents, parseCurrencyToCents } from "../../../utils/money";

export function CardFormModal({ busy, editing, form, isOpen, onChange, onClose, onSubmit }: { busy: boolean; editing: boolean; form: CreditCardInput; isOpen: boolean; onChange: (form: CreditCardInput) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return <Modal isOpen={isOpen} title={editing ? "Editar cartão" : "Novo cartão"} onClose={onClose}><form className="grid gap-4" onSubmit={onSubmit}>
    <FormField id="card-name" label="Nome"><Input id="card-name" required value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} /></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="card-bank" label="Banco/instituição"><Input id="card-bank" value={form.institution} onChange={(event) => onChange({ ...form, institution: event.target.value })} /></FormField><FormField id="card-last-four" label="Final do cartão"><Input id="card-last-four" inputMode="numeric" maxLength={4} value={form.lastFour} onChange={(event) => onChange({ ...form, lastFour: event.target.value.replace(/\D/g, "").slice(0, 4) })} /></FormField></div>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="card-limit" label="Limite"><CurrencyInput id="card-limit" value={formatCurrencyFromCents(form.limitInCents)} onChange={(event) => onChange({ ...form, limitInCents: parseCurrencyToCents(event.target.value) })} /></FormField><FormField id="card-brand" label="Bandeira"><Select id="card-brand" value={form.brand ?? "OTHER"} onChange={(event) => onChange({ ...form, brand: event.target.value as CreditCardInput["brand"] })}><option value="OTHER">Outra</option><option value="VISA">Visa</option><option value="MASTERCARD">Mastercard</option><option value="ELO">Elo</option><option value="AMEX">American Express</option><option value="HIPERCARD">Hipercard</option></Select></FormField></div>
    <div className="grid gap-4 sm:grid-cols-4"><FormField id="closing-day" label="Fechamento"><Input id="closing-day" min={1} max={31} type="number" value={form.closingDay} onChange={(event) => onChange({ ...form, closingDay: Number(event.target.value) })} /></FormField><FormField id="due-day" label="Vencimento"><Input id="due-day" min={1} max={31} type="number" value={form.dueDay} onChange={(event) => onChange({ ...form, dueDay: Number(event.target.value) })} /></FormField><FormField id="card-color" label="Cor"><Input id="card-color" type="color" value={form.color} onChange={(event) => onChange({ ...form, color: event.target.value })} /></FormField><FormField id="card-status" label="Status"><Select id="card-status" value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as CreditCardInput["status"] })}><option value="ACTIVE">Ativo</option><option value="ARCHIVED">Arquivado</option></Select></FormField></div>
    <FormActions busy={busy} onClose={onClose} submitLabel="Salvar" />
  </form></Modal>;
}

type PurchaseFormProps = { busy: boolean; cards: CreditCard[]; categories: Category[]; editing: boolean; form: CardPurchaseInput; isOpen: boolean; onChange: (form: CardPurchaseInput) => void; onClose: () => void; onSubmit: (event: FormEvent) => void };

export function PurchaseFormModal(props: PurchaseFormProps) {
  const { editing, isOpen, onClose } = props;
  return <Modal isOpen={isOpen} title={editing ? "Editar compra" : "Nova compra no cartão"} onClose={onClose}>{isOpen ? <PurchaseFormFields {...props} /> : null}</Modal>;
}

function PurchaseFormFields({ busy, cards, categories, editing, form, onChange, onClose, onSubmit }: PurchaseFormProps) {
  const [installmentsOpen, setInstallmentsOpen] = useState(editing && form.installmentsCount > 1);

  function toggleInstallments(enabled: boolean) {
    setInstallmentsOpen(enabled);
    onChange(enabled
      ? { ...form, installmentsCount: Math.max(2, form.installmentsCount), firstInstallmentDate: form.firstInstallmentDate ?? form.purchaseDate }
      : { ...form, installmentsCount: 1, firstInstallmentDate: form.purchaseDate });
  }

  return <form className="grid gap-4" onSubmit={onSubmit}>
    <FormField id="purchase-amount" label="Valor total"><CurrencyInput autoFocus id="purchase-amount" value={formatCurrencyFromCents(form.amountInCents)} onChange={(event) => onChange({ ...form, amountInCents: parseCurrencyToCents(event.target.value) })} /></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="purchase-description" label="Descrição"><Input autoComplete="off" id="purchase-description" required value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} /></FormField><FormField id="purchase-category" label="Categoria"><Select id="purchase-category" required value={form.categoryId ?? ""} onChange={(event) => onChange({ ...form, categoryId: event.target.value })}><option value="">Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></FormField></div>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="purchase-card" label="Cartão"><Select disabled={editing} id="purchase-card" required value={form.cardId} onChange={(event) => onChange({ ...form, cardId: event.target.value })}><option value="">Selecione</option>{cards.filter((card) => card.status === "ACTIVE" || card.id === form.cardId).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</Select></FormField><FormField id="purchase-date" label="Data"><Input id="purchase-date" type="date" value={toDateInputValue(form.purchaseDate)} onChange={(event) => { const purchaseDate = new Date(`${event.target.value}T12:00:00`); onChange({ ...form, purchaseDate, firstInstallmentDate: installmentsOpen ? form.firstInstallmentDate : purchaseDate }); }} /></FormField></div>
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-700" htmlFor="purchase-installments-toggle">
      <input checked={installmentsOpen} className="h-5 w-5 accent-emerald-600" id="purchase-installments-toggle" onChange={(event) => toggleInstallments(event.target.checked)} type="checkbox" />
      Parcelar compra
    </label>
    {installmentsOpen ? <div className="space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/70">
      <div className="grid gap-4 sm:grid-cols-2"><FormField id="installments" label="Quantidade de parcelas"><Input id="installments" inputMode="numeric" min={2} max={48} type="number" value={form.installmentsCount} onChange={(event) => onChange({ ...form, installmentsCount: Math.max(2, Number(event.target.value)) })} /></FormField><FormField id="first-installment" label="Primeira parcela"><Input id="first-installment" type="date" value={toDateInputValue(form.firstInstallmentDate)} onChange={(event) => onChange({ ...form, firstInstallmentDate: new Date(`${event.target.value}T12:00:00`) })} /></FormField></div>
      <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Parcela estimada: <strong>{formatCurrencyFromCents(form.installmentsCount > 0 ? Math.round(form.amountInCents / form.installmentsCount) : 0)}</strong></div>
    </div> : null}
    <FormActions busy={busy} onClose={onClose} submitLabel={editing ? "Salvar" : "Registrar"} />
  </form>;
}

export function PaymentFormModal({ accounts, form, isOpen, onChange, onClose, onSubmit }: { accounts: Account[]; form: { invoiceId: string; accountId: string; amountInCents: number }; isOpen: boolean; onChange: (form: { invoiceId: string; accountId: string; amountInCents: number }) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return <Modal isOpen={isOpen} title="Pagar fatura" onClose={onClose}><form className="grid gap-4" onSubmit={onSubmit}><FormField id="payment-account" label="Conta de pagamento"><Select id="payment-account" required value={form.accountId} onChange={(event) => onChange({ ...form, accountId: event.target.value })}><option value="">Selecione</option>{accounts.filter((account) => account.status === "ACTIVE").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></FormField><FormField id="payment-amount" label="Valor"><CurrencyInput id="payment-amount" value={formatCurrencyFromCents(form.amountInCents)} onChange={(event) => onChange({ ...form, amountInCents: parseCurrencyToCents(event.target.value) })} /></FormField><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Pagar</Button></div></form></Modal>;
}

export function ConfirmActionModal({ busy, description, isOpen, onClose, onConfirm, title }: { busy: boolean; description?: string; isOpen: boolean; onClose: () => void; onConfirm: () => void; title?: string }) {
  return <ConfirmDialog busy={busy} description={description} isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} title={title ?? "Confirmar ação"} />;
}

function FormActions({ busy, onClose, submitLabel }: { busy: boolean; onClose: () => void; submitLabel: string }) {
  return <div className="flex justify-end gap-2"><Button disabled={busy} variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} type="submit">{busy ? "Salvando..." : submitLabel}</Button></div>;
}
