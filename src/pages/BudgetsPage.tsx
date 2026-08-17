import { Archive, Edit2, PiggyBank, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { getBudgetAlertLevel } from "../business/budgets";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CurrencyInput } from "../components/CurrencyInput";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { LoadingState } from "../components/LoadingState";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Select } from "../components/Select";
import { Toast } from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";
import { archiveBudget, createBudget, listBudgetsWithUsage, updateBudget, type BudgetInput } from "../services/budgetsService";
import { listCategories } from "../services/categoriesService";
import type { BudgetWithUsage } from "../types/budget";
import type { Category } from "../types/category";
import { endOfMonth, formatDatePtBr, startOfMonth, toDateInputValue } from "../utils/date";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { formatCurrencyFromCents, parseCurrencyToCents } from "../utils/money";

function emptyForm(): BudgetInput {
  return { name: "", categoryId: "", limitInCents: 0, startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()), status: "ACTIVE" };
}

export function BudgetsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<BudgetInput>(emptyForm);
  const [editing, setEditing] = useState<BudgetWithUsage | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const expenseCategories = useMemo(() => categories.filter((item) => item.type === "EXPENSE" && item.status === "ACTIVE"), [categories]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const [nextBudgets, nextCategories] = await Promise.all([listBudgetsWithUsage(user.uid), listCategories(user.uid)]);
      setBudgets(nextBudgets); setCategories(nextCategories);
    } catch (cause) { setError(getFriendlyFirebaseError(cause, "Nao foi possivel carregar os orcamentos.")); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    const next = emptyForm(); next.categoryId = expenseCategories[0]?.id ?? "";
    setEditing(null); setForm(next); setOpen(true);
  }
  function openEdit(item: BudgetWithUsage) {
    setEditing(item); setForm({ name: item.name, categoryId: item.categoryId, limitInCents: item.limitInCents, startDate: item.startDate, endDate: item.endDate, status: item.status }); setOpen(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!user) return;
    try {
      if (editing) await updateBudget(user.uid, editing.id, form); else await createBudget(user.uid, form);
      setMessage(editing ? "Orcamento atualizado." : "Orcamento criado."); setOpen(false); await load();
    } catch (cause) { setMessage(getFriendlyFirebaseError(cause, "Nao foi possivel salvar o orcamento.")); }
  }
  async function archive(item: BudgetWithUsage) {
    try { await archiveBudget(item.id); setMessage("Orcamento arquivado."); await load(); }
    catch (cause) { setMessage(getFriendlyFirebaseError(cause, "Nao foi possivel arquivar o orcamento.")); }
  }

  return <>
    <PageHeader title="Orcamentos" description="Defina limites por categoria e acompanhe o consumo no periodo." action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Novo orcamento</Button>} />
    {message ? <div className="mb-4"><Toast>{message}</Toast></div> : null}
    {error ? <ErrorState message={error} /> : loading ? <Card><LoadingState label="Carregando orcamentos" /></Card> : budgets.length === 0 ? <Card><EmptyState title="Nenhum orcamento" description="Crie um limite para acompanhar seus gastos por categoria." icon={<PiggyBank className="h-6 w-6" />} /></Card> :
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{budgets.map((item) => {
        const alert = getBudgetAlertLevel(item.percentage);
        const variant = alert === "AT_100" ? "danger" : alert === "AT_80" ? "warning" : alert === "AT_50" ? "neutral" : "success";
        return <Card key={item.id} className={item.status === "ARCHIVED" ? "opacity-65" : ""}>
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{item.name}</h2><p className="text-sm text-slate-500">{categories.find((c) => c.id === item.categoryId)?.name ?? "Categoria"}</p></div><Badge variant={variant}>{item.percentage}%</Badge></div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full ${alert === "AT_100" ? "bg-rose-600" : alert === "AT_80" ? "bg-amber-500" : "bg-emerald-600"}`} style={{ width: `${Math.min(100, item.percentage)}%` }} /></div>
          <p className="mt-3 text-sm"><strong>{formatCurrencyFromCents(item.spentInCents)}</strong> de {formatCurrencyFromCents(item.limitInCents)}</p>
          <p className="mt-1 text-xs text-slate-500">{formatDatePtBr(item.startDate)} a {formatDatePtBr(item.endDate)} · {item.remainingInCents >= 0 ? `${formatCurrencyFromCents(item.remainingInCents)} restante` : `${formatCurrencyFromCents(Math.abs(item.remainingInCents))} excedido`}</p>
          {item.status !== "ARCHIVED" ? <div className="mt-4 flex gap-2"><Button variant="ghost" onClick={() => openEdit(item)}><Edit2 className="h-4 w-4" />Editar</Button><Button variant="ghost" onClick={() => void archive(item)}><Archive className="h-4 w-4" />Arquivar</Button></div> : null}
        </Card>;
      })}</div>}
    <Modal isOpen={open} title={editing ? "Editar orcamento" : "Novo orcamento"} onClose={() => setOpen(false)}><form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <FormField id="budget-name" label="Nome"><Input id="budget-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField>
      <div className="grid gap-4 sm:grid-cols-2"><FormField id="budget-category" label="Categoria"><Select id="budget-category" required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Selecione</option>{expenseCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormField><FormField id="budget-limit" label="Limite"><CurrencyInput id="budget-limit" required value={formatCurrencyFromCents(form.limitInCents)} onChange={(event) => setForm({ ...form, limitInCents: parseCurrencyToCents(event.target.value) })} /></FormField></div>
      <div className="grid gap-4 sm:grid-cols-2"><FormField id="budget-start" label="Inicio"><Input id="budget-start" type="date" required value={toDateInputValue(form.startDate)} onChange={(event) => setForm({ ...form, startDate: new Date(`${event.target.value}T00:00:00`) })} /></FormField><FormField id="budget-end" label="Fim"><Input id="budget-end" type="date" required value={toDateInputValue(form.endDate)} onChange={(event) => setForm({ ...form, endDate: new Date(`${event.target.value}T23:59:59.999`) })} /></FormField></div>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
    </form></Modal>
  </>;
}
