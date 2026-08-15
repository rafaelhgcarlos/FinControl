import { Edit2, Pause, Play, RefreshCw, Repeat, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
import { Textarea } from "../components/Textarea";
import { Toast } from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";
import { listAccounts } from "../services/accountsService";
import { listCards } from "../services/cardsService";
import { listCategories } from "../services/categoriesService";
import { createRecurringTransaction, listRecurringTransactions, processDueRecurringTransactions, updateRecurringStatus, updateRecurringTransaction, type RecurringTransactionInput } from "../services/recurringTransactionsService";
import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { CreditCard } from "../types/creditCard";
import type { RecurringFrequency, RecurringStatus, RecurringTargetType, RecurringTransaction, RecurringTransactionType } from "../types/recurringTransaction";
import { formatDatePtBr, toDateInputValue } from "../utils/date";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { formatCurrencyFromCents, parseCurrencyToCents } from "../utils/money";

const today = toDateInputValue(new Date());

const initialForm: RecurringTransactionInput = {
  amountInCents: 0,
  type: "EXPENSE",
  targetType: "ACCOUNT",
  frequency: "MONTHLY",
  status: "ACTIVE",
  categoryId: "",
  accountId: "",
  cardId: "",
  description: "",
  startDate: new Date(`${today}T12:00:00.000-03:00`),
};

export function RecurringTransactionsPage() {
  const { user } = useAuth();
  const [recurrences, setRecurrences] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [form, setForm] = useState<RecurringTransactionInput>(initialForm);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const processedOnLoad = useRef(false);

  const activeAccounts = useMemo(() => accounts.filter((account) => account.status === "ACTIVE"), [accounts]);
  const activeCards = useMemo(() => cards.filter((card) => card.status === "ACTIVE"), [cards]);
  const activeCategories = useMemo(() => categories.filter((category) => category.status === "ACTIVE" && category.type === form.type), [categories, form.type]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [nextRecurrences, nextAccounts, nextCategories, nextCards] = await Promise.all([
      listRecurringTransactions(user.uid),
      listAccounts(user.uid),
      listCategories(user.uid),
      listCards(user.uid),
    ]);
    let loadedRecurrences = nextRecurrences;
    if (!processedOnLoad.current) {
      processedOnLoad.current = true;
      const processed = await processDueRecurringTransactions(user.uid, nextRecurrences, nextAccounts, nextCategories, nextCards);
      if (processed > 0) {
        loadedRecurrences = await listRecurringTransactions(user.uid);
        setMessage(`${processed} ocorrencia(s) recorrente(s) processada(s).`);
      }
    }
    setRecurrences(loadedRecurrences);
    setAccounts(nextAccounts);
    setCategories(nextCategories);
    setCards(nextCards);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadData().catch((error) => {
      setMessage(getFriendlyFirebaseError(error, "Nao foi possivel carregar recorrencias."));
      setLoading(false);
    });
  }, [loadData]);

  function openCreate() {
    const category = categories.find((item) => item.status === "ACTIVE" && item.type === initialForm.type);
    setEditing(null);
    setForm({
      ...initialForm,
      accountId: activeAccounts[0]?.id ?? "",
      cardId: activeCards[0]?.id ?? "",
      categoryId: category?.id ?? "",
    });
    setIsOpen(true);
  }

  function openEdit(recurrence: RecurringTransaction) {
    setEditing(recurrence);
    setForm({
      amountInCents: recurrence.amountInCents,
      type: recurrence.type,
      targetType: recurrence.targetType,
      frequency: recurrence.frequency,
      status: recurrence.status,
      categoryId: recurrence.categoryId,
      accountId: recurrence.accountId ?? "",
      cardId: recurrence.cardId ?? "",
      description: recurrence.description,
      startDate: recurrence.startDate,
      endDate: recurrence.endDate,
      nextOccurrenceDate: recurrence.nextOccurrenceDate,
    });
    setIsOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    try {
      if (editing) {
        await updateRecurringTransaction(editing.id, form);
        setMessage("Recorrencia atualizada.");
      } else {
        await createRecurringTransaction(user.uid, form);
        setMessage("Recorrencia criada.");
      }
      setIsOpen(false);
      await loadData();
    } catch (error) {
      setMessage(getFriendlyFirebaseError(error, "Nao foi possivel salvar a recorrencia."));
    }
  }

  async function handleStatus(recurrence: RecurringTransaction, status: RecurringStatus) {
    try {
      await updateRecurringStatus(recurrence.id, status);
      setMessage(status === "CANCELED" ? "Recorrencia cancelada." : status === "PAUSED" ? "Recorrencia pausada." : "Recorrencia reativada.");
      await loadData();
    } catch (error) {
      setMessage(getFriendlyFirebaseError(error, "Nao foi possivel alterar a recorrencia."));
    }
  }

  async function handleProcessDue() {
    if (!user) return;
    try {
      setProcessing(true);
      const processed = await processDueRecurringTransactions(user.uid, recurrences, accounts, categories, cards);
      setMessage(processed > 0 ? `${processed} ocorrencia(s) processada(s).` : "Nenhuma recorrencia vencida.");
      await loadData();
    } catch (error) {
      setMessage(getFriendlyFirebaseError(error, "Nao foi possivel processar recorrencias."));
    } finally {
      setProcessing(false);
    }
  }

  function setFormType(type: RecurringTransactionType) {
    setForm({
      ...form,
      type,
      targetType: type === "INCOME" ? "ACCOUNT" : form.targetType,
      categoryId: categories.find((category) => category.status === "ACTIVE" && category.type === type)?.id ?? "",
    });
  }

  return (
    <>
      <PageHeader
        title="Recorrencias"
        description="Automatize receitas e despesas quando o app for aberto, sem tarefas periodicas no backend."
        action={<div className="flex gap-2"><Button variant="secondary" onClick={() => void handleProcessDue()} disabled={processing}><RefreshCw className="h-4 w-4" aria-hidden="true" />Processar</Button><Button onClick={openCreate}><Repeat className="h-4 w-4" aria-hidden="true" />Nova recorrencia</Button></div>}
      />
      {message ? <div className="mb-4"><Toast>{message}</Toast></div> : null}
      <Card>
        {loading ? <LoadingState label="Carregando recorrencias" /> : recurrences.length === 0 ? (
          <EmptyState title="Nenhuma recorrencia" description="Crie uma receita ou despesa recorrente para gerar ocorrencias automaticamente." icon={<Repeat className="h-6 w-6" aria-hidden="true" />} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {recurrences.map((recurrence) => (
              <div key={recurrence.id} className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{recurrence.description}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatCurrencyFromCents(recurrence.amountInCents)} - {frequencyLabel(recurrence.frequency)} - prox. {formatDatePtBr(recurrence.nextOccurrenceDate)}</p>
                  </div>
                  <Badge variant={recurrence.status === "ACTIVE" ? "success" : recurrence.status === "PAUSED" ? "warning" : "neutral"}>{statusLabel(recurrence.status)}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button aria-label="Editar recorrencia" variant="ghost" onClick={() => openEdit(recurrence)}><Edit2 className="h-4 w-4" aria-hidden="true" />Editar</Button>
                  {recurrence.status === "ACTIVE" ? <Button variant="ghost" onClick={() => void handleStatus(recurrence, "PAUSED")}><Pause className="h-4 w-4" aria-hidden="true" />Pausar</Button> : null}
                  {recurrence.status === "PAUSED" ? <Button variant="ghost" onClick={() => void handleStatus(recurrence, "ACTIVE")}><Play className="h-4 w-4" aria-hidden="true" />Retomar</Button> : null}
                  {recurrence.status !== "CANCELED" ? <Button variant="ghost" onClick={() => void handleStatus(recurrence, "CANCELED")}><XCircle className="h-4 w-4" aria-hidden="true" />Cancelar</Button> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Modal isOpen={isOpen} title={editing ? "Editar recorrencia" : "Nova recorrencia"} onClose={() => setIsOpen(false)}>
        <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="recurring-type" label="Tipo"><Select id="recurring-type" value={form.type} onChange={(event) => setFormType(event.target.value as RecurringTransactionType)}><option value="INCOME">Receita</option><option value="EXPENSE">Despesa</option></Select></FormField>
            <FormField id="recurring-value" label="Valor"><CurrencyInput id="recurring-value" required value={formatCurrencyFromCents(form.amountInCents)} onChange={(event) => setForm({ ...form, amountInCents: parseCurrencyToCents(event.target.value) })} /></FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="recurring-target" label="Destino"><Select id="recurring-target" value={form.targetType} onChange={(event) => setForm({ ...form, targetType: event.target.value as RecurringTargetType })}><option value="ACCOUNT">Conta</option>{form.type === "EXPENSE" ? <option value="CARD">Cartao</option> : null}</Select></FormField>
            <FormField id="recurring-frequency" label="Frequencia"><Select id="recurring-frequency" value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value as RecurringFrequency })}><option value="WEEKLY">Semanal</option><option value="MONTHLY">Mensal</option><option value="YEARLY">Anual</option></Select></FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {form.targetType === "ACCOUNT" ? <FormField id="recurring-account" label="Conta"><Select id="recurring-account" required value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></FormField> : <FormField id="recurring-card" label="Cartao"><Select id="recurring-card" required value={form.cardId} onChange={(event) => setForm({ ...form, cardId: event.target.value })}>{activeCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</Select></FormField>}
            <FormField id="recurring-category" label="Categoria"><Select id="recurring-category" required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="recurring-start" label="Inicio"><Input id="recurring-start" type="date" required value={toDateInputValue(form.startDate)} onChange={(event) => setForm({ ...form, startDate: new Date(`${event.target.value}T12:00:00.000-03:00`), nextOccurrenceDate: new Date(`${event.target.value}T12:00:00.000-03:00`) })} /></FormField>
            <FormField id="recurring-end" label="Fim opcional"><Input id="recurring-end" type="date" value={form.endDate ? toDateInputValue(form.endDate) : ""} onChange={(event) => setForm({ ...form, endDate: event.target.value ? new Date(`${event.target.value}T12:00:00.000-03:00`) : undefined })} /></FormField>
          </div>
          <FormField id="recurring-description" label="Descricao"><Textarea id="recurring-description" required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
        </form>
      </Modal>
    </>
  );
}

function frequencyLabel(frequency: RecurringFrequency) {
  return frequency === "WEEKLY" ? "Semanal" : frequency === "MONTHLY" ? "Mensal" : "Anual";
}

function statusLabel(status: RecurringStatus) {
  return status === "ACTIVE" ? "Ativa" : status === "PAUSED" ? "Pausada" : "Cancelada";
}
