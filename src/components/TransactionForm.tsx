import { ChevronDown } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { TransactionInput } from "../services/transactionsService";
import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { TransactionType } from "../types/transaction";
import { toDateInputValue } from "../utils/date";
import { formatCurrencyFromCents, parseCurrencyToCents } from "../utils/money";
import { CurrencyInput } from "./CurrencyInput";
import { FormField } from "./FormField";
import { Input } from "./Input";
import { Select } from "./Select";
import { Textarea } from "./Textarea";
import { FormActions } from "./ui/FormActions";
import { focusFirstInvalidField, type FormStatus } from "../hooks/useFormState";

type TransactionField = "amount" | "account" | "category" | "destination" | "date";
type TransactionFormErrors = Partial<Record<TransactionField, string>>;

type TransactionFormProps = {
  accounts: Account[];
  categories: Category[];
  form: TransactionInput;
  formStatus?: FormStatus;
  onCancel: () => void;
  onChange: (form: TransactionInput) => void;
  onSubmit: () => void | Promise<void>;
  onTypeChange: (type: TransactionType) => void;
  submitting?: boolean;
};

export function validateTransactionForm(form: TransactionInput, accounts: Account[], categories: Category[]): TransactionFormErrors {
  const errors: TransactionFormErrors = {};
  if (form.amountInCents <= 0) errors.amount = "Informe um valor maior que zero.";
  if (!form.accountId || !accounts.some((account) => account.id === form.accountId)) errors.account = "Selecione uma conta ativa.";
  if (!form.date || Number.isNaN(form.date.getTime())) errors.date = "Informe uma data válida.";

  if (form.type === "TRANSFER") {
    if (!form.destinationAccountId || !accounts.some((account) => account.id === form.destinationAccountId)) {
      errors.destination = "Selecione uma conta de destino.";
    } else if (form.destinationAccountId === form.accountId) {
      errors.destination = "Origem e destino precisam ser diferentes.";
    }
  } else if (!form.categoryId || !categories.some((category) => category.id === form.categoryId)) {
    errors.category = "Selecione uma categoria ativa.";
  }

  return errors;
}

export function TransactionForm({ accounts, categories, form, formStatus = "initial", onCancel, onChange, onSubmit, onTypeChange, submitting = false }: TransactionFormProps) {
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(Boolean(form.description?.trim()));

  function update(patch: Partial<TransactionInput>) {
    setErrors({});
    onChange({ ...form, ...patch });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateTransactionForm(form, accounts, categories);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) void onSubmit();
    else {
      const ids: Record<TransactionField, string> = { amount: "transaction-value", account: "transaction-account", category: "transaction-category", destination: "transaction-destination", date: "transaction-date" };
      focusFirstInvalidField((["amount", "account", "category", "destination", "date"] as const).filter((key) => nextErrors[key]).map((key) => ids[key]));
    }
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="transaction-type" label="Tipo">
          <Select
            id="transaction-type"
            value={form.type}
            onChange={(event) => {
              setErrors({});
              onTypeChange(event.target.value as TransactionType);
            }}
          >
            <option value="INCOME">Receita</option>
            <option value="EXPENSE">Despesa</option>
            <option value="TRANSFER">Transferência</option>
          </Select>
        </FormField>
        <FormField error={errors.amount} id="transaction-value" label="Valor">
          <CurrencyInput
            aria-describedby={errors.amount ? "transaction-value-error" : undefined}
            aria-invalid={Boolean(errors.amount)}
            autoFocus
            id="transaction-value"
            required
            value={formatCurrencyFromCents(form.amountInCents)}
            onChange={(event) => update({ amountInCents: parseCurrencyToCents(event.target.value) })}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField error={errors.account} id="transaction-account" label={form.type === "TRANSFER" ? "Conta de origem" : "Conta"}>
          <Select
            aria-describedby={errors.account ? "transaction-account-error" : undefined}
            aria-invalid={Boolean(errors.account)}
            id="transaction-account"
            required
            value={form.accountId}
            onChange={(event) => update({ accountId: event.target.value })}
          >
            <option value="">Selecione</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </Select>
        </FormField>
        {form.type === "TRANSFER" ? (
          <FormField error={errors.destination} id="transaction-destination" label="Conta de destino">
            <Select
              aria-describedby={errors.destination ? "transaction-destination-error" : undefined}
              aria-invalid={Boolean(errors.destination)}
              id="transaction-destination"
              required
              value={form.destinationAccountId}
              onChange={(event) => update({ destinationAccountId: event.target.value })}
            >
              <option value="">Selecione</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </Select>
          </FormField>
        ) : (
          <FormField error={errors.category} id="transaction-category" label="Categoria">
            <Select
              aria-describedby={errors.category ? "transaction-category-error" : undefined}
              aria-invalid={Boolean(errors.category)}
              id="transaction-category"
              required
              value={form.categoryId}
              onChange={(event) => update({ categoryId: event.target.value })}
            >
              <option value="">Selecione</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </FormField>
        )}
      </div>

      <FormField error={errors.date} id="transaction-date" label="Data">
        <Input
          aria-describedby={errors.date ? "transaction-date-error" : undefined}
          aria-invalid={Boolean(errors.date)}
          id="transaction-date"
          required
          type="date"
          value={toDateInputValue(form.date)}
          onChange={(event) => update({ date: new Date(`${event.target.value}T12:00:00.000Z`) })}
        />
      </FormField>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700">
        <button
          aria-controls="transaction-more-options"
          aria-expanded={moreOptionsOpen}
          className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-300"
          onClick={() => setMoreOptionsOpen((open) => !open)}
          type="button"
        >
          <span>Mais opções</span>
          <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${moreOptionsOpen ? "rotate-180" : ""}`} />
        </button>
        {moreOptionsOpen ? (
          <div className="border-t border-slate-200 p-3.5 dark:border-slate-700" id="transaction-more-options">
            <FormField hint="Opcional. Use para facilitar buscas futuras." id="transaction-description" label="Descrição">
              <Textarea id="transaction-description" value={form.description} onChange={(event) => update({ description: event.target.value })} />
            </FormField>
          </div>
        ) : null}
      </div>

      <FormActions busy={submitting} onCancel={onCancel} status={formStatus} />
    </form>
  );
}
