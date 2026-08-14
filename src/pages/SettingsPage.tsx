import { useEffect, useState, type FormEvent } from "react";
import { Check, LogOut, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { PageHeader } from "../components/PageHeader";
import { Select } from "../components/Select";
import { useAuth } from "../contexts/AuthContext";
import { useTheme, type ThemePreference } from "../contexts/ThemeContext";
import { logout } from "../services/authService";
import { deleteUserAccount } from "../services/userService";

export function SettingsPage() {
  const { profile, saveProfile } = useAuth(); const { preference, setPreference } = useTheme(); const navigate = useNavigate();
  const [name, setName] = useState(""); const [currency, setCurrency] = useState("BRL"); const [timeZone, setTimeZone] = useState("America/Sao_Paulo"); const [saved, setSaved] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { setName(profile?.displayName ?? ""); setCurrency(profile?.currency ?? "BRL"); setTimeZone(profile?.timeZone ?? "America/Sao_Paulo"); }, [profile]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setSaved(false); await saveProfile({ displayName: name.trim() || null, currency: currency as "BRL", timeZone: timeZone as "America/Sao_Paulo" }); setSaved(true); setBusy(false); }
  async function signOut() { await logout(); navigate("/login", { replace: true }); }
  async function deleteAccount() { if (!window.confirm("Excluir sua conta e todos os dados financeiros associados? Esta ação não pode ser desfeita.")) return; setBusy(true); try { await deleteUserAccount(); await logout(); navigate("/", { replace: true }); } finally { setBusy(false); } }
  return <><PageHeader title="Configurações" description="Gerencie seus dados, preferências e acesso." /><div className="grid max-w-4xl gap-4 xl:grid-cols-2"><Card><h2 className="text-base font-semibold">Perfil e preferências</h2><form className="mt-5 space-y-4" onSubmit={submit}><FormField id="profile-name" label="Nome"><Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} /></FormField><FormField id="profile-email" label="E-mail"><Input id="profile-email" disabled value={profile?.email ?? ""} /></FormField><FormField id="currency" label="Moeda"><Select id="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="BRL">Real brasileiro (BRL)</option></Select></FormField><FormField id="timezone" label="Fuso horário"><Select id="timezone" value={timeZone} onChange={(event) => setTimeZone(event.target.value)}><option value="America/Sao_Paulo">Brasília (America/Sao_Paulo)</option></Select></FormField><FormField id="theme" label="Tema"><Select id="theme" value={preference} onChange={(event) => setPreference(event.target.value as ThemePreference)}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Escuro</option></Select></FormField><div className="flex items-center gap-3"><Button disabled={busy} type="submit"><Save className="h-4 w-4" aria-hidden="true" />{busy ? "Salvando..." : "Salvar alterações"}</Button>{saved ? <span className="flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-300"><Check className="h-4 w-4" aria-hidden="true" />Salvo</span> : null}</div></form></Card><Card><h2 className="text-base font-semibold">Acesso</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Sua senha é gerenciada com segurança pelo Firebase Authentication.</p><div className="mt-5 space-y-2"><Button className="w-full justify-start" onClick={() => void signOut()} variant="secondary"><LogOut className="h-4 w-4" aria-hidden="true" />Sair da conta</Button><Button className="w-full justify-start" disabled={busy} onClick={() => void deleteAccount()} variant="danger"><Trash2 className="h-4 w-4" aria-hidden="true" />Excluir conta</Button></div></Card></div></>;
}
