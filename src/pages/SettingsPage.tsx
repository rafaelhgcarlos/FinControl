import { Check, LogOut, Save, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { PageHeader } from "../components/PageHeader";
import { Select } from "../components/Select";
import { Toast } from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";
import { useTheme, type ThemePreference } from "../contexts/ThemeContext";
import { logout } from "../services/authService";
import { deleteUserAccount } from "../services/userService";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";

export function SettingsPage() {
  const { profile, saveProfile } = useAuth();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [timeZone, setTimeZone] = useState("America/Sao_Paulo");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.displayName ?? "");
    setCurrency(profile?.currency ?? "BRL");
    setTimeZone(profile?.timeZone ?? "America/Sao_Paulo");
  }, [profile]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setMessage(null);
    try {
      await saveProfile({ displayName: name.trim() || null, currency: currency as "BRL", timeZone: timeZone as "America/Sao_Paulo" });
      setSaved(true);
    } catch (error) {
      setMessage(getFriendlyFirebaseError(error, "Nao foi possivel salvar suas configuracoes."));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  async function deleteAccount() {
    if (!window.confirm("Excluir sua conta e todos os dados financeiros associados? Esta acao nao pode ser desfeita.")) return;
    setBusy(true);
    try {
      await deleteUserAccount();
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      setMessage(getFriendlyFirebaseError(error, "Nao foi possivel excluir sua conta."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Configuracoes" description="Gerencie perfil, preferencias e acesso da conta." />
      {message ? <div className="mb-4"><Toast>{message}</Toast></div> : null}
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <h2 className="text-base font-semibold">Perfil e preferencias</h2>
          <form className="mt-5 grid gap-4" onSubmit={(event) => void submit(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="profile-name" label="Nome">
                <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
              </FormField>
              <FormField id="profile-email" label="E-mail">
                <Input id="profile-email" disabled value={profile?.email ?? ""} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField id="currency" label="Moeda">
                <Select id="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="BRL">Real brasileiro (BRL)</option>
                </Select>
              </FormField>
              <FormField id="timezone" label="Fuso horario">
                <Select id="timezone" value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>
                  <option value="America/Sao_Paulo">Brasilia</option>
                </Select>
              </FormField>
              <FormField id="theme" label="Tema">
                <Select id="theme" value={preference} onChange={(event) => setPreference(event.target.value as ThemePreference)}>
                  <option value="system">Sistema</option>
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                </Select>
              </FormField>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button disabled={busy} type="submit"><Save className="h-4 w-4" aria-hidden="true" />{busy ? "Salvando..." : "Salvar alteracoes"}</Button>
              {saved ? <span className="flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-300"><Check className="h-4 w-4" aria-hidden="true" />Salvo</span> : null}
            </div>
          </form>
        </Card>
        <Card>
          <h2 className="text-base font-semibold">Acesso</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Firebase Authentication protege o login. As regras do Firestore isolam os dados por usuario.</p>
          <div className="mt-5 grid gap-2">
            <Button className="w-full justify-start" onClick={() => void signOut()} variant="secondary"><LogOut className="h-4 w-4" aria-hidden="true" />Sair da conta</Button>
            <Button className="w-full justify-start" disabled={busy} onClick={() => void deleteAccount()} variant="danger"><Trash2 className="h-4 w-4" aria-hidden="true" />Excluir conta</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
