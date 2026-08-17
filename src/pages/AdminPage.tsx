import { Ban, Edit2, Plus, ScrollText, ShieldCheck, Tags, Unlock, Users } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { LoadingState } from "../components/LoadingState";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
import { Toast } from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";
import { createGlobalCategory, getAdminOverview, listAuditLogs, listGlobalCategories, setGlobalCategoryStatus, updateGlobalCategory, type GlobalCategoryInput } from "../services/adminService";
import type { AdminOverview, AuditLog, GlobalCategory } from "../types/admin";
import { formatDatePtBr } from "../utils/date";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";

const initialForm: GlobalCategoryInput = { name: "", type: "EXPENSE", icon: "Tag", color: "#059669" };

export function AdminPage() {
  const { user } = useAuth(); const [overview, setOverview] = useState<AdminOverview | null>(null); const [categories, setCategories] = useState<GlobalCategory[]>([]); const [logs, setLogs] = useState<AuditLog[]>([]);
  const [form, setForm] = useState(initialForm); const [editing, setEditing] = useState<GlobalCategory | null>(null); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const [nextOverview, nextCategories, nextLogs] = await Promise.all([getAdminOverview(), listGlobalCategories(), listAuditLogs()]); setOverview(nextOverview); setCategories(nextCategories); setLogs(nextLogs); } catch (cause) { setError(getFriendlyFirebaseError(cause, "Nao foi possivel carregar a administracao.")); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  function openCreate() { setEditing(null); setForm(initialForm); setOpen(true); }
  function openEdit(item: GlobalCategory) { setEditing(item); setForm({ name: item.name, type: item.type, icon: item.icon, color: item.color }); setOpen(true); }
  async function submit(event: FormEvent) { event.preventDefault(); if (!user) return; try { if (editing) await updateGlobalCategory(user.uid, editing.id, form); else await createGlobalCategory(user.uid, form); setOpen(false); setMessage(editing ? "Categoria global atualizada." : "Categoria global criada."); await load(); } catch (cause) { setMessage(getFriendlyFirebaseError(cause, "Nao foi possivel salvar a categoria global.")); } }
  async function toggle(item: GlobalCategory) { if (!user) return; try { await setGlobalCategoryStatus(user.uid, item.id, item.status === "ACTIVE" ? "BLOCKED" : "ACTIVE"); setMessage(item.status === "ACTIVE" ? "Categoria bloqueada." : "Categoria desbloqueada."); await load(); } catch (cause) { setMessage(getFriendlyFirebaseError(cause, "Nao foi possivel alterar a categoria.")); } }
  return <>
    <PageHeader title="Administracao" description="Metricas gerais, categorias globais e auditoria sem acesso aos dados financeiros dos usuarios." action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nova categoria global</Button>} />
    {message ? <div className="mb-4"><Toast>{message}</Toast></div> : null}
    {error ? <ErrorState message={error} /> : loading ? <Card><LoadingState label="Carregando administracao" /></Card> : <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3"><StatCard icon={Users} label="Usuarios cadastrados" value={overview?.registeredUsers?.toLocaleString("pt-BR") ?? "Manual"} detail="Metrica agregada sem perfis" /><StatCard icon={Tags} label="Categorias globais" value={String(overview?.globalCategories ?? 0)} /><StatCard icon={ScrollText} label="Acoes recentes" value={String(overview?.recentActions ?? 0)} detail="Somente metadados de auditoria" /></div>
      <Card><h2 className="font-semibold">Categorias globais</h2>{categories.length === 0 ? <div className="mt-4"><EmptyState title="Nenhuma categoria global" description="Cadastre modelos reutilizaveis sem acessar categorias privadas." icon={<ShieldCheck className="h-6 w-6" />} /></div> : <div className="mt-4 grid gap-3 md:grid-cols-2">{categories.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-slate-500">{item.type === "INCOME" ? "Receita" : "Despesa"}</p></div><Badge variant={item.status === "ACTIVE" ? "success" : "danger"}>{item.status === "ACTIVE" ? "Ativa" : "Bloqueada"}</Badge></div><div className="mt-3 flex gap-2"><Button variant="ghost" onClick={() => openEdit(item)}><Edit2 className="h-4 w-4" />Editar</Button><Button variant="ghost" onClick={() => void toggle(item)}>{item.status === "ACTIVE" ? <Ban className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}{item.status === "ACTIVE" ? "Bloquear" : "Desbloquear"}</Button></div></div>)}</div>}</Card>
      <Card><h2 className="font-semibold">Auditoria recente</h2><p className="mt-1 text-sm text-slate-500">Os registros guardam apenas ator, acao, entidade, ID e horario.</p>{logs.length === 0 ? <p className="mt-4 text-sm text-slate-500">Nenhum evento administrativo.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 dark:border-slate-800"><th className="py-2">Acao</th><th>Entidade</th><th>Ator</th><th>Data</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b border-slate-100 dark:border-slate-900"><td className="py-2">{log.action}</td><td>{log.entity}:{log.entityId}</td><td className="font-mono text-xs">{log.userId}</td><td>{formatDatePtBr(log.createdAt)}</td></tr>)}</tbody></table></div>}</Card>
    </div>}
    <Modal isOpen={open} title={editing ? "Editar categoria global" : "Nova categoria global"} onClose={() => setOpen(false)}><form className="grid gap-4" onSubmit={(event) => void submit(event)}><FormField id="global-name" label="Nome"><Input id="global-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField id="global-type" label="Tipo"><Select id="global-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as GlobalCategoryInput["type"] })}><option value="EXPENSE">Despesa</option><option value="INCOME">Receita</option></Select></FormField><FormField id="global-icon" label="Icone"><Input id="global-icon" required value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} /></FormField></div><FormField id="global-color" label="Cor"><Input id="global-color" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></FormField><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div></form></Modal>
  </>;
}
