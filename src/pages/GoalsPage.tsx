import { Archive, Edit2, Minus, Plus, Target } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CurrencyInput } from "../components/CurrencyInput";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { ListSkeleton } from "../components/ui/Skeleton";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Toast } from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";
import { useActionLock } from "../hooks/useActionLock";
import { archiveGoal, changeGoalAmount, createGoal, listGoals, updateGoal, type GoalInput } from "../services/goalsService";
import type { GoalProgress } from "../types/goal";
import { formatDatePtBr, toDateInputValue } from "../utils/date";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { formatCurrencyFromCents, parseCurrencyToCents } from "../utils/money";

const initialForm: GoalInput = { name: "", targetAmountInCents: 0, currentAmountInCents: 0, category: "", icon: "Target", status: "ACTIVE" };

export function GoalsPage() {
  const { user } = useAuth();
  const { isActionPending, runAction } = useActionLock();
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [form, setForm] = useState<GoalInput>(initialForm);
  const [editing, setEditing] = useState<GoalProgress | null>(null);
  const [amountGoal, setAmountGoal] = useState<GoalProgress | null>(null);
  const [amountInCents, setAmountInCents] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return; setLoading(true); setError(null);
    try { setGoals(await listGoals(user.uid)); }
    catch (cause) { setError(getFriendlyFirebaseError(cause, "Nao foi possivel carregar as metas.")); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  function openCreate() { setEditing(null); setForm(initialForm); setOpen(true); }
  function openEdit(item: GoalProgress) {
    setEditing(item); setForm({ name: item.name, targetAmountInCents: item.targetAmountInCents, currentAmountInCents: item.currentAmountInCents, deadline: item.deadline, category: item.category, icon: item.icon, status: item.status }); setOpen(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!user) return;
    await runAction("goal:save", async () => {
      try { if (editing) await updateGoal(user.uid, editing.id, form); else await createGoal(user.uid, form); setMessage(editing ? "Meta atualizada." : "Meta criada."); setOpen(false); await load(); }
      catch (cause) { setMessage(getFriendlyFirebaseError(cause, "Nao foi possivel salvar a meta.")); }
    });
  }
  async function changeAmount(direction: 1 | -1) {
    if (!amountGoal) return;
    await runAction("goal:amount", async () => {
      try { await changeGoalAmount(amountGoal.id, amountInCents * direction); setMessage(direction > 0 ? "Valor adicionado." : "Valor retirado."); setAmountGoal(null); setAmountInCents(0); await load(); }
      catch (cause) { setMessage(getFriendlyFirebaseError(cause, "Nao foi possivel alterar o valor.")); }
    });
  }
  async function archive(item: GoalProgress) {
    await runAction(`goal:archive:${item.id}`, async () => {
      try { await archiveGoal(item.id); setMessage("Meta arquivada."); await load(); }
      catch (cause) { setMessage(getFriendlyFirebaseError(cause, "Nao foi possivel arquivar a meta.")); }
    });
  }

  return <>
    <PageHeader title="Metas financeiras" description="Acompanhe objetivos sem movimentar automaticamente o saldo das contas." action={<Button disabled={isActionPending()} onClick={openCreate}><Plus className="h-4 w-4" />Nova meta</Button>} />
    {message ? <div className="mb-4"><Toast>{message}</Toast></div> : null}
    {error ? <ErrorState message={error} /> : loading ? <ListSkeleton label="Carregando metas" /> : goals.length === 0 ? <Card><EmptyState action={<Button disabled={isActionPending()} onClick={openCreate}><Plus className="h-4 w-4" />Criar meta</Button>} title="Nenhuma meta" description="Defina um objetivo e registre sua evolução." icon={<Target className="h-6 w-6" />} /></Card> :
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{goals.map((item) => <Card key={item.id} className={item.status === "ARCHIVED" ? "opacity-65" : ""}>
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{item.name}</h2><p className="text-sm text-slate-500">{item.category || "Objetivo financeiro"}</p></div><Badge variant={item.status === "COMPLETED" ? "success" : item.status === "ARCHIVED" ? "neutral" : "warning"}>{item.status === "COMPLETED" ? "Concluida" : item.status === "ARCHIVED" ? "Arquivada" : "Em andamento"}</Badge></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-emerald-600" style={{ width: `${item.progressPercent}%` }} /></div>
        <p className="mt-3 text-sm"><strong>{formatCurrencyFromCents(item.currentAmountInCents)}</strong> de {formatCurrencyFromCents(item.targetAmountInCents)} · {item.progressPercent}%</p>
        <p className="mt-1 text-xs text-slate-500">{item.deadline ? `Prazo: ${formatDatePtBr(item.deadline)}` : "Sem prazo definido"}</p>
        {item.status !== "ARCHIVED" ? <div className="mt-4 flex flex-wrap gap-2"><Button disabled={isActionPending()} variant="ghost" onClick={() => { setAmountGoal(item); setAmountInCents(0); }}><Plus className="h-4 w-4" /><Minus className="h-4 w-4" />Valor</Button><Button disabled={isActionPending()} variant="ghost" onClick={() => openEdit(item)}><Edit2 className="h-4 w-4" />Editar</Button><Button disabled={isActionPending()} variant="ghost" onClick={() => void archive(item)}><Archive className="h-4 w-4" />Arquivar</Button></div> : null}
      </Card>)}</div>}
    <Modal isOpen={open} title={editing ? "Editar meta" : "Nova meta"} onClose={() => setOpen(false)}><form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <FormField id="goal-name" label="Nome"><Input id="goal-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField>
      <div className="grid gap-4 sm:grid-cols-2"><FormField id="goal-target" label="Valor objetivo"><CurrencyInput id="goal-target" required value={formatCurrencyFromCents(form.targetAmountInCents)} onChange={(event) => setForm({ ...form, targetAmountInCents: parseCurrencyToCents(event.target.value) })} /></FormField><FormField id="goal-current" label="Valor atual"><CurrencyInput id="goal-current" value={formatCurrencyFromCents(form.currentAmountInCents)} onChange={(event) => setForm({ ...form, currentAmountInCents: parseCurrencyToCents(event.target.value) })} /></FormField></div>
      <div className="grid gap-4 sm:grid-cols-2"><FormField id="goal-category" label="Categoria opcional"><Input id="goal-category" value={form.category ?? ""} onChange={(event) => setForm({ ...form, category: event.target.value })} /></FormField><FormField id="goal-deadline" label="Prazo opcional"><Input id="goal-deadline" type="date" value={form.deadline ? toDateInputValue(form.deadline) : ""} onChange={(event) => setForm({ ...form, deadline: event.target.value ? new Date(`${event.target.value}T12:00:00-03:00`) : undefined })} /></FormField></div>
      <div className="flex justify-end gap-2"><Button disabled={isActionPending("goal:save")} variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={isActionPending("goal:save")} type="submit">{isActionPending("goal:save") ? "Salvando..." : "Salvar"}</Button></div>
    </form></Modal>
    <Modal isOpen={Boolean(amountGoal)} title="Atualizar valor da meta" description="Este registro acompanha o progresso e nao movimenta contas." onClose={() => setAmountGoal(null)}><div className="grid gap-4"><FormField id="goal-amount" label="Valor"><CurrencyInput id="goal-amount" value={formatCurrencyFromCents(amountInCents)} onChange={(event) => setAmountInCents(parseCurrencyToCents(event.target.value))} /></FormField><div className="flex justify-end gap-2"><Button variant="secondary" disabled={amountInCents <= 0 || isActionPending("goal:amount")} onClick={() => void changeAmount(-1)}>{isActionPending("goal:amount") ? "Processando..." : <><Minus className="h-4 w-4" />Retirar</>}</Button><Button disabled={amountInCents <= 0 || isActionPending("goal:amount")} onClick={() => void changeAmount(1)}>{isActionPending("goal:amount") ? "Processando..." : <><Plus className="h-4 w-4" />Adicionar</>}</Button></div></div></Modal>
  </>;
}
