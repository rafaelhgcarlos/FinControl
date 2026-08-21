import { AlertTriangle, BookOpen, Check, KeyRound, LogOut, Monitor, Moon, Save, Sun, Trash2, UserRound } from "lucide-react";
import { cloneElement, useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useTheme, type ThemePreference } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { changePassword, logout } from "../services/authService";
import { deleteUserAccount } from "../services/userService";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";

const deletionConfirmation = "EXCLUIR";

export function SettingsPage() {
  const { profile, saveProfile } = useAuth();
  const { preference, setPreference } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string; confirmation?: string }>({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [deletionPassword, setDeletionPassword] = useState("");
  const [deletionText, setDeletionText] = useState("");
  const [deletionError, setDeletionError] = useState<string | undefined>();
  const [deletionProgress, setDeletionProgress] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const savedName = profile?.displayName ?? "";
  const profileDirty = name.trim() !== savedName.trim();

  useEffect(() => setName(savedName), [savedName]);

  useEffect(() => {
    if (!profileDirty) return;
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnAboutUnsavedChanges);
    return () => window.removeEventListener("beforeunload", warnAboutUnsavedChanges);
  }, [profileDirty]);

  useEffect(() => {
    if (!profileDirty) return;
    const guardInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.href === window.location.href) return;
      if (!window.confirm("Você tem alterações não salvas no perfil. Deseja sair sem salvar?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", guardInternalNavigation, true);
    return () => document.removeEventListener("click", guardInternalNavigation, true);
  }, [profileDirty]);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileDirty || savingProfile) return;
    setSavingProfile(true);
    try {
      await saveProfile({ displayName: name.trim() || null });
      toast.success("Seu perfil foi atualizado.", { title: "Perfil salvo" });
    } catch (error) {
      toast.error(getFriendlyFirebaseError(error, "Não foi possível salvar seu perfil."), { title: "Erro ao salvar perfil" });
    } finally {
      setSavingProfile(false);
    }
  }

  function selectTheme(theme: ThemePreference) {
    if (theme !== preference) setPreference(theme);
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getFriendlyFirebaseError(error, "Não foi possível sair da conta."), { title: "Erro ao sair" });
      setSigningOut(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changingPassword) return;
    const errors = {
      current: currentPassword ? undefined : "Informe sua senha atual.",
      next: nextPassword.length >= 6 ? undefined : "Use pelo menos 6 caracteres.",
      confirmation: nextPassword === confirmPassword ? undefined : "As senhas não conferem.",
    };
    setPasswordErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, nextPassword);
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
      toast.success("Use a nova senha no próximo acesso.", { title: "Senha alterada" });
    } catch (error) {
      toast.error(getFriendlyFirebaseError(error, "Não foi possível alterar a senha."), { title: "Erro ao alterar senha" });
    } finally {
      setChangingPassword(false);
    }
  }

  function openDeletion() {
    setDeletionPassword("");
    setDeletionText("");
    setDeletionError(undefined);
    setDeletionProgress(null);
    setDeletionOpen(true);
  }

  function closeDeletion() {
    if (!deletingAccount) setDeletionOpen(false);
  }

  async function deleteAccount() {
    if (deletingAccount || !deletionPassword || deletionText !== deletionConfirmation) return;
    setDeletingAccount(true);
    setDeletionError(undefined);
    setDeletionProgress("Validando sua identidade antes de excluir os dados.");
    try {
      await deleteUserAccount(deletionPassword, (progress) => {
        setDeletionProgress(`Excluindo dados: ${progress.completedCollections} de ${progress.totalCollections} coleções, ${progress.deletedDocuments} documentos removidos.`);
      });
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      const message = getFriendlyFirebaseError(error, "Não foi possível excluir sua conta. Confirme a senha e tente novamente.");
      setDeletionError(message);
      setDeletionProgress(null);
      toast.error(message, { title: "Exclusão não concluída" });
      setDeletingAccount(false);
    }
  }

  const themes = useMemo(() => [
    { value: "system" as const, label: "Sistema", description: "Acompanha o dispositivo", Icon: Monitor },
    { value: "light" as const, label: "Claro", description: "Fundo claro", Icon: Sun },
    { value: "dark" as const, label: "Escuro", description: "Fundo escuro", Icon: Moon },
  ], []);

  return (
    <>
      <PageHeader title="Configurações" description="Gerencie seu perfil, aparência e acesso à conta." />
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Card as="section" aria-labelledby="profile-title">
            <SectionHeading description="Atualize como seu nome aparece no FinControl." icon={<UserRound />} id="profile-title" title="Perfil" />
            <form className="mt-5 grid gap-4" onSubmit={(event) => void submitProfile(event)}>
              <FormField id="profile-name" label="Nome"><Input id="profile-name" autoComplete="name" disabled={savingProfile} value={name} onChange={(event) => setName(event.target.value)} /></FormField>
              <div className="rounded-control border border-border bg-surface-subtle px-3.5 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">E-mail da conta</p><p className="mt-1 break-all text-sm text-foreground">{profile?.email ?? "Não informado"}</p></div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button disabled={!profileDirty || savingProfile} loading={savingProfile} type="submit">{!savingProfile ? <Save className="h-4 w-4" aria-hidden="true" /> : null}{savingProfile ? "Salvando..." : "Salvar perfil"}</Button>
                <p aria-live="polite" className="text-xs text-muted-foreground">{profileDirty ? "Alterações não salvas" : "Perfil atualizado"}</p>
              </div>
            </form>
          </Card>

          <Card as="section" aria-labelledby="appearance-title">
            <SectionHeading description="O tema é aplicado e salvo imediatamente neste dispositivo." icon={<Sun />} id="appearance-title" title="Aparência" />
            <fieldset className="mt-5"><legend className="sr-only">Escolha o tema</legend><div className="grid gap-2 sm:grid-cols-3">
              {themes.map(({ description, Icon, label, value }) => {
                const selected = preference === value;
                return <button aria-pressed={selected} className={`relative min-h-24 rounded-control border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-surface-subtle"}`} key={value} onClick={() => selectTheme(value)} type="button"><Icon className="h-5 w-5" aria-hidden="true" /><span className="mt-3 block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>{selected ? <Check className="absolute right-3 top-3 h-4 w-4" aria-hidden="true" /> : null}</button>;
              })}
            </div><p aria-live="polite" className="mt-3 text-xs text-muted-foreground">Tema {themeLabel(preference)} selecionado.</p></fieldset>
            <div className="mt-5 border-t border-border pt-4"><h3 className="text-sm font-semibold">Formato regional</h3><p className="mt-1 text-sm text-muted-foreground">Português (Brasil) · Real brasileiro (BRL) · Horário de Brasília</p></div>
          </Card>

          <Card as="section" aria-labelledby="product-title">
            <SectionHeading description="Consulte novamente os conceitos básicos sem criar dados automaticamente." icon={<BookOpen />} id="product-title" title="Ajuda e produto" />
            <Button className="mt-5" onClick={() => navigate("/app/onboarding?review=1")} variant="secondary"><BookOpen className="h-4 w-4" aria-hidden="true" />Rever introdução</Button>
          </Card>
        </div>

        <div className="space-y-4">
          <Card as="section" aria-labelledby="security-title">
            <SectionHeading description="Confirme sua senha atual para definir uma nova." icon={<KeyRound />} id="security-title" title="Segurança" />
            <form className="mt-5 grid gap-4" onSubmit={(event) => void submitPassword(event)} noValidate>
              <FormField error={passwordErrors.current} id="current-password" label="Senha atual"><Input id="current-password" autoComplete="current-password" disabled={changingPassword} type="password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordErrors((value) => ({ ...value, current: undefined })); }} /></FormField>
              <FormField error={passwordErrors.next} hint="Use pelo menos 6 caracteres." id="next-password" label="Nova senha"><Input id="next-password" autoComplete="new-password" disabled={changingPassword} type="password" value={nextPassword} onChange={(event) => { setNextPassword(event.target.value); setPasswordErrors((value) => ({ ...value, next: undefined })); }} /></FormField>
              <FormField error={passwordErrors.confirmation} id="confirm-password" label="Confirmar nova senha"><Input id="confirm-password" autoComplete="new-password" disabled={changingPassword} type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordErrors((value) => ({ ...value, confirmation: undefined })); }} /></FormField>
              <div><Button loading={changingPassword} type="submit" variant="secondary">{changingPassword ? "Alterando..." : "Alterar senha"}</Button></div>
            </form>
          </Card>

          <Card as="section" aria-labelledby="session-title"><SectionHeading description="Seus dados permanecerão salvos para o próximo acesso." icon={<LogOut />} id="session-title" title="Sessão" /><Button className="mt-5" loading={signingOut} onClick={() => void handleSignOut()} variant="secondary">{!signingOut ? <LogOut className="h-4 w-4" aria-hidden="true" /> : null}{signingOut ? "Saindo..." : "Sair da conta"}</Button></Card>

          <Card as="section" aria-labelledby="danger-title" className="border-danger/35"><SectionHeading danger description="A exclusão remove permanentemente sua conta e seus dados." icon={<AlertTriangle />} id="danger-title" title="Zona de perigo" /><p className="mt-4 text-sm leading-6 text-muted-foreground">Use esta opção somente se não quiser mais acessar contas, transações, cartões, faturas, metas e demais informações financeiras.</p><Button className="mt-5" onClick={openDeletion} variant="danger"><Trash2 className="h-4 w-4" aria-hidden="true" />Excluir conta</Button></Card>
        </div>
      </div>

      <Modal closeDisabled={deletingAccount} description="Esta ação é irreversível e removerá todos os dados financeiros associados à conta." initialFocus="#deletion-password" isOpen={deletionOpen} onClose={closeDeletion} title="Excluir conta permanentemente?">
        <div className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm text-foreground"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" /><p>Contas, transações, cartões, faturas, metas e demais dados serão removidos. Não será possível recuperá-los.</p></div></div>
        <div className="mt-5 grid gap-4">
          <FormField error={deletionError} id="deletion-password" label="Senha atual"><Input id="deletion-password" autoComplete="current-password" disabled={deletingAccount} type="password" value={deletionPassword} onChange={(event) => { setDeletionPassword(event.target.value); setDeletionError(undefined); }} /></FormField>
          <FormField hint={`Digite ${deletionConfirmation} em letras maiúsculas.`} id="deletion-confirmation" label="Confirmação"><Input id="deletion-confirmation" autoComplete="off" disabled={deletingAccount} value={deletionText} onChange={(event) => setDeletionText(event.target.value)} /></FormField>
          {deletionProgress ? <p aria-live="assertive" className="rounded-control bg-surface-subtle px-3 py-2 text-sm text-muted-foreground">{deletionProgress}</p> : null}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button disabled={deletingAccount} onClick={closeDeletion} variant="secondary">Cancelar</Button><Button disabled={!deletionPassword || deletionText !== deletionConfirmation} loading={deletingAccount} onClick={() => void deleteAccount()} variant="danger">{!deletingAccount ? <Trash2 className="h-4 w-4" aria-hidden="true" /> : null}{deletingAccount ? "Excluindo dados..." : "Excluir minha conta"}</Button></div>
      </Modal>
    </>
  );
}

function SectionHeading({ danger = false, description, icon, id, title }: { danger?: boolean; description: string; icon: ReactElement<{ className?: string; "aria-hidden"?: boolean }>; id: string; title: string }) {
  return <div className="flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${danger ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"}`}>{cloneElement(icon, { className: "h-4 w-4", "aria-hidden": true })}</span><div><h2 className="text-base font-semibold" id={id}>{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div>;
}

function themeLabel(preference: ThemePreference) {
  return preference === "dark" ? "escuro" : preference === "light" ? "claro" : "do sistema";
}
