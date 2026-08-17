import { useState, type FormEvent } from "react";
import { CurrencyInput } from "../../../components/CurrencyInput";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { Modal } from "../../../components/Modal";
import { Select } from "../../../components/Select";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { FormActions } from "../../../components/ui/FormActions";
import { UnsavedChangesDialog } from "../../../components/ui/UnsavedChangesDialog";
import { focusFirstInvalidField, useFormState, useUnsavedChangesGuard, type FormStatus } from "../../../hooks/useFormState";
import type { Account } from "../../../types/account";
import type { Category } from "../../../types/category";
import type { CreditCard } from "../../../types/creditCard";
import { toDateInputValue } from "../../../utils/date";
import { formatCurrencyFromCents, parseCurrencyToCents } from "../../../utils/money";
import type { CardPurchaseInput, CreditCardInput } from "../services/cardsService";

type CardFormError = "name" | "limit" | "lastFour" | "closingDay" | "dueDay";
type PurchaseFormError = "description" | "amount" | "category" | "card" | "purchaseDate" | "installments" | "firstInstallmentDate";
type PaymentForm = { invoiceId: string; accountId: string; amountInCents: number };

export function validateCardForm(form: CreditCardInput): Partial<Record<CardFormError, string>> {
  const errors: Partial<Record<CardFormError, string>> = {};
  if (!form.name.trim()) errors.name = "Informe um nome para identificar o cartão.";
  if (form.limitInCents <= 0) errors.limit = "Informe um limite maior que zero.";
  if (form.lastFour && form.lastFour.length !== 4) errors.lastFour = "Informe exatamente os quatro últimos dígitos.";
  if (form.closingDay < 1 || form.closingDay > 31) errors.closingDay = "Use um dia entre 1 e 31.";
  if (form.dueDay < 1 || form.dueDay > 31) errors.dueDay = "Use um dia entre 1 e 31.";
  return errors;
}

export function CardFormModal({ busy, editing, form, isOpen, onChange, onClose, onSubmit }: { busy: boolean; editing: boolean; form: CreditCardInput; isOpen: boolean; onChange: (form: CreditCardInput) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const [errors, setErrors] = useState<Partial<Record<CardFormError, string>>>({});
  const formState = useFormState(form, isOpen, busy);
  const closeGuard = useUnsavedChangesGuard({ busy, dirty: formState.dirty, onClose });
  const requestClose = closeGuard.requestClose;

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateCardForm(form);
    setErrors(nextErrors);
    const idByError: Record<CardFormError, string> = { name: "card-name", limit: "card-limit", lastFour: "card-last-four", closingDay: "closing-day", dueDay: "due-day" };
    const invalidIds = (["name", "limit", "lastFour", "closingDay", "dueDay"] as const).filter((key) => nextErrors[key]).map((key) => idByError[key]);
    if (invalidIds.length) { focusFirstInvalidField(invalidIds); return; }
    onSubmit(event);
  }

  const update = (next: CreditCardInput) => { setErrors({}); onChange(next); };
  return <><Modal closeDisabled={busy} initialFocus="#card-name" isOpen={isOpen} title={editing ? "Editar cartão" : "Novo cartão"} onClose={requestClose}><form className="grid gap-4" noValidate onSubmit={submit}>
    <FormField error={errors.name} id="card-name" label="Nome"><Input id="card-name" required value={form.name} onChange={(event) => update({ ...form, name: event.target.value })} /></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="card-bank" label="Banco/instituição"><Input id="card-bank" value={form.institution} onChange={(event) => update({ ...form, institution: event.target.value })} /></FormField><FormField error={errors.lastFour} id="card-last-four" label="Final do cartão"><Input id="card-last-four" inputMode="numeric" maxLength={4} value={form.lastFour} onChange={(event) => update({ ...form, lastFour: event.target.value.replace(/\D/g, "").slice(0, 4) })} /></FormField></div>
    <div className="grid gap-4 sm:grid-cols-2"><FormField error={errors.limit} id="card-limit" label="Limite"><CurrencyInput id="card-limit" value={formatCurrencyFromCents(form.limitInCents)} onChange={(event) => update({ ...form, limitInCents: parseCurrencyToCents(event.target.value) })} /></FormField><FormField id="card-brand" label="Bandeira"><Select id="card-brand" value={form.brand ?? "OTHER"} onChange={(event) => update({ ...form, brand: event.target.value as CreditCardInput["brand"] })}><option value="OTHER">Outra</option><option value="VISA">Visa</option><option value="MASTERCARD">Mastercard</option><option value="ELO">Elo</option><option value="AMEX">American Express</option><option value="HIPERCARD">Hipercard</option></Select></FormField></div>
    <div className="grid gap-4 sm:grid-cols-4"><FormField error={errors.closingDay} id="closing-day" label="Fechamento"><Input id="closing-day" min={1} max={31} type="number" value={form.closingDay} onChange={(event) => update({ ...form, closingDay: Number(event.target.value) })} /></FormField><FormField error={errors.dueDay} id="due-day" label="Vencimento"><Input id="due-day" min={1} max={31} type="number" value={form.dueDay} onChange={(event) => update({ ...form, dueDay: Number(event.target.value) })} /></FormField><FormField id="card-color" label="Cor"><Input id="card-color" type="color" value={form.color} onChange={(event) => update({ ...form, color: event.target.value })} /></FormField><FormField id="card-status" label="Status"><Select id="card-status" value={form.status} onChange={(event) => update({ ...form, status: event.target.value as CreditCardInput["status"] })}><option value="ACTIVE">Ativo</option><option value="ARCHIVED">Arquivado</option></Select></FormField></div>
    <FormActions busy={busy} onCancel={requestClose} status={formState.status} />
  </form></Modal><UnsavedChangesDialog isOpen={closeGuard.confirmationOpen} onDiscard={closeGuard.discardChanges} onKeepEditing={closeGuard.keepEditing} /></>;
}

type PurchaseFormProps = { busy: boolean; cards: CreditCard[]; categories: Category[]; editing: boolean; form: CardPurchaseInput; isOpen: boolean; onChange: (form: CardPurchaseInput) => void; onClose: () => void; onSubmit: (event: FormEvent) => void };

export function PurchaseFormModal(props: PurchaseFormProps) {
  const { busy, editing, form, isOpen, onClose } = props;
  const formState = useFormState(form, isOpen, busy);
  const closeGuard = useUnsavedChangesGuard({ busy, dirty: formState.dirty, onClose });
  return <><Modal closeDisabled={busy} initialFocus="#purchase-description" isOpen={isOpen} title={editing ? "Editar compra" : "Nova compra no cartão"} onClose={closeGuard.requestClose}>{isOpen ? <PurchaseFormFields {...props} onRequestClose={closeGuard.requestClose} status={formState.status} /> : null}</Modal><UnsavedChangesDialog isOpen={closeGuard.confirmationOpen} onDiscard={closeGuard.discardChanges} onKeepEditing={closeGuard.keepEditing} /></>;
}

function validatePurchaseForm(form: CardPurchaseInput): Partial<Record<PurchaseFormError, string>> {
  const errors: Partial<Record<PurchaseFormError, string>> = {};
  if (!form.description.trim()) errors.description = "Descreva a compra para identificá-la na fatura.";
  if (form.amountInCents <= 0) errors.amount = "Informe um valor maior que zero.";
  if (!form.categoryId) errors.category = "Selecione uma categoria.";
  if (!form.cardId) errors.card = "Selecione um cartão ativo.";
  if (Number.isNaN(form.purchaseDate.getTime())) errors.purchaseDate = "Informe uma data válida.";
  if (form.installmentsCount < 1 || form.installmentsCount > 48) errors.installments = "Use entre 1 e 48 parcelas.";
  if (Number.isNaN(form.firstInstallmentDate.getTime())) errors.firstInstallmentDate = "Informe uma data válida para a primeira parcela.";
  return errors;
}

function PurchaseFormFields({ busy, cards, categories, editing, form, onChange, onRequestClose, onSubmit, status }: PurchaseFormProps & { onRequestClose: () => void; status: FormStatus }) {
  const [installmentsOpen, setInstallmentsOpen] = useState(editing && form.installmentsCount > 1);
  const [errors, setErrors] = useState<Partial<Record<PurchaseFormError, string>>>({});
  const update = (next: CardPurchaseInput) => { setErrors({}); onChange(next); };

  function toggleInstallments(enabled: boolean) {
    setInstallmentsOpen(enabled);
    update(enabled ? { ...form, installmentsCount: Math.max(2, form.installmentsCount), firstInstallmentDate: form.firstInstallmentDate ?? form.purchaseDate } : { ...form, installmentsCount: 1, firstInstallmentDate: form.purchaseDate });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validatePurchaseForm(form);
    setErrors(nextErrors);
    const ids: Record<PurchaseFormError, string> = { description: "purchase-description", amount: "purchase-amount", category: "purchase-category", card: "purchase-card", purchaseDate: "purchase-date", installments: "installments", firstInstallmentDate: "first-installment" };
    const invalidIds = (["description", "amount", "category", "card", "purchaseDate", "installments", "firstInstallmentDate"] as const).filter((key) => nextErrors[key]).map((key) => ids[key]);
    if (invalidIds.length) { focusFirstInvalidField(invalidIds); return; }
    onSubmit(event);
  }

  return <form className="grid gap-4" noValidate onSubmit={submit}>
    <div className="grid gap-4 sm:grid-cols-2"><FormField error={errors.description} id="purchase-description" label="Descrição"><Input autoComplete="off" id="purchase-description" required value={form.description} onChange={(event) => update({ ...form, description: event.target.value })} /></FormField><FormField error={errors.amount} id="purchase-amount" label="Valor total"><CurrencyInput id="purchase-amount" value={formatCurrencyFromCents(form.amountInCents)} onChange={(event) => update({ ...form, amountInCents: parseCurrencyToCents(event.target.value) })} /></FormField></div>
    <div className="grid gap-4 sm:grid-cols-2"><FormField error={errors.category} id="purchase-category" label="Categoria"><Select id="purchase-category" required value={form.categoryId ?? ""} onChange={(event) => update({ ...form, categoryId: event.target.value })}><option value="">Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></FormField><FormField error={errors.card} id="purchase-card" label="Cartão"><Select disabled={editing} id="purchase-card" required value={form.cardId} onChange={(event) => update({ ...form, cardId: event.target.value })}><option value="">Selecione</option>{cards.filter((card) => card.status === "ACTIVE" || card.id === form.cardId).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</Select></FormField></div>
    <FormField error={errors.purchaseDate} id="purchase-date" label="Data"><Input id="purchase-date" type="date" value={toDateInputValue(form.purchaseDate)} onChange={(event) => { const purchaseDate = new Date(`${event.target.value}T12:00:00`); update({ ...form, purchaseDate, firstInstallmentDate: installmentsOpen ? form.firstInstallmentDate : purchaseDate }); }} /></FormField>
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control border border-border px-3 py-2 text-sm font-medium" htmlFor="purchase-installments-toggle"><input checked={installmentsOpen} className="h-5 w-5 accent-primary" id="purchase-installments-toggle" onChange={(event) => toggleInstallments(event.target.checked)} type="checkbox" />Parcelar compra</label>
    {installmentsOpen ? <div className="space-y-3 rounded-surface bg-surface-subtle p-3"><div className="grid gap-4 sm:grid-cols-2"><FormField error={errors.installments} id="installments" label="Quantidade de parcelas"><Input id="installments" inputMode="numeric" min={2} max={48} type="number" value={form.installmentsCount} onChange={(event) => update({ ...form, installmentsCount: Number(event.target.value) })} /></FormField><FormField error={errors.firstInstallmentDate} id="first-installment" label="Primeira parcela"><Input id="first-installment" type="date" value={toDateInputValue(form.firstInstallmentDate)} onChange={(event) => update({ ...form, firstInstallmentDate: new Date(`${event.target.value}T12:00:00`) })} /></FormField></div><div className="rounded-control bg-success/10 px-3 py-2 text-sm text-success">Parcela estimada: <strong>{formatCurrencyFromCents(form.installmentsCount > 0 ? Math.round(form.amountInCents / form.installmentsCount) : 0)}</strong></div></div> : null}
    <FormActions busy={busy} onCancel={onRequestClose} status={status} submitLabel={editing ? "Salvar" : "Registrar"} />
  </form>;
}

export function PaymentFormModal({ accounts, busy = false, form, isOpen, onChange, onClose, onSubmit }: { accounts: Account[]; busy?: boolean; form: PaymentForm; isOpen: boolean; onChange: (form: PaymentForm) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const [errors, setErrors] = useState<Partial<Record<"account" | "amount", string>>>({});
  const formState = useFormState(form, isOpen, busy);
  const closeGuard = useUnsavedChangesGuard({ busy, dirty: formState.dirty, onClose });
  const requestClose = closeGuard.requestClose;
  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = { ...(!form.accountId ? { account: "Selecione a conta usada no pagamento." } : {}), ...(form.amountInCents <= 0 ? { amount: "Informe um valor maior que zero." } : {}) };
    setErrors(nextErrors);
    const ids = [nextErrors.account ? "payment-account" : "", nextErrors.amount ? "payment-amount" : ""].filter(Boolean);
    if (ids.length) { focusFirstInvalidField(ids); return; }
    onSubmit(event);
  }
  const update = (next: PaymentForm) => { setErrors({}); onChange(next); };
  return <><Modal closeDisabled={busy} initialFocus="#payment-account" isOpen={isOpen} title="Pagar fatura" onClose={requestClose}><form className="grid gap-4" noValidate onSubmit={submit}><FormField error={errors.account} id="payment-account" label="Conta de pagamento"><Select id="payment-account" required value={form.accountId} onChange={(event) => update({ ...form, accountId: event.target.value })}><option value="">Selecione</option>{accounts.filter((account) => account.status === "ACTIVE").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></FormField><FormField error={errors.amount} id="payment-amount" label="Valor"><CurrencyInput id="payment-amount" value={formatCurrencyFromCents(form.amountInCents)} onChange={(event) => update({ ...form, amountInCents: parseCurrencyToCents(event.target.value) })} /></FormField><FormActions busy={busy} busyLabel="Processando..." onCancel={requestClose} status={formState.status} submitLabel="Pagar" /></form></Modal><UnsavedChangesDialog isOpen={closeGuard.confirmationOpen} onDiscard={closeGuard.discardChanges} onKeepEditing={closeGuard.keepEditing} /></>;
}

export function ConfirmActionModal({ busy, description, isOpen, onClose, onConfirm, title }: { busy: boolean; description?: string; isOpen: boolean; onClose: () => void; onConfirm: () => void; title?: string }) {
  return <ConfirmDialog busy={busy} description={description} isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} title={title ?? "Confirmar ação"} />;
}
