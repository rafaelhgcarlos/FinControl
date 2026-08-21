import { ArrowRight, CheckCircle2, CreditCard as CreditCardIcon, Landmark, ReceiptText, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { AccountIconPicker } from "../components/AccountIconPicker";
import { Card } from "../components/Card";
import { CurrencyInput } from "../components/CurrencyInput";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { FormActions } from "../components/ui/FormActions";
import { UnsavedChangesDialog } from "../components/ui/UnsavedChangesDialog";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { CardFormModal } from "../features/cards/components/CardForms";
import { createCard, listCards, type CreditCard, type CreditCardInput } from "../features/cards";
import { focusFirstInvalidField, useFormState, useUnsavedChangesGuard } from "../hooks/useFormState";
import { accountTypes, createAccount, listAccounts, type AccountInput } from "../services/accountsService";
import type { Account, AccountType } from "../types/account";
import type { OnboardingStep } from "../types/user";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { formatCurrencyFromCents, parseCurrencyToCents } from "../utils/money";

const initialAccountForm: AccountInput = { name: "", type: "CHECKING", initialBalanceInCents: 0, institution: "", color: "#059669", icon: "Landmark", status: "ACTIVE" };
const initialCardForm: CreditCardInput = { name: "", institution: "", lastFour: "", brand: "OTHER", limitInCents: 0, closingDay: 10, dueDay: 20, color: "#2563eb", status: "ACTIVE" };

export function OnboardingPage() {
  const { profile, saveOnboarding, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "1";
  const [step, setStep] = useState<OnboardingStep>(() => reviewMode ? 1 : profile?.onboardingStep ?? 1);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardForm, setCardForm] = useState<CreditCardInput>(initialCardForm);
  const [savingCard, setSavingCard] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(false);
  const [createdCard, setCreatedCard] = useState(false);

  const loadEntities = useCallback(async () => {
    if (!user) return;
    const [nextAccounts, nextCards] = await Promise.all([listAccounts(user.uid), listCards(user.uid)]);
    setAccounts(nextAccounts);
    setCards(nextCards);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    void loadEntities().catch((error) => toast.error(getFriendlyFirebaseError(error, "Não foi possível carregar seus primeiros passos."))).finally(() => setLoading(false));
  }, [loadEntities, toast]);

  useEffect(() => {
    if (reviewMode || profile?.onboardingStatus !== "NOT_STARTED") return;
    void saveOnboarding("IN_PROGRESS", 1).catch((error) => toast.error(getFriendlyFirebaseError(error, "Não foi possível iniciar o onboarding.")));
  }, [profile?.onboardingStatus, reviewMode, saveOnboarding, toast]);

  async function goToStep(nextStep: OnboardingStep) {
    setSavingProgress(true);
    try {
      if (!reviewMode) await saveOnboarding("IN_PROGRESS", nextStep);
      setStep(nextStep);
    } catch (error) {
      toast.error(getFriendlyFirebaseError(error, "Não foi possível salvar seu progresso."));
    } finally {
      setSavingProgress(false);
    }
  }

  async function skipOnboarding() {
    setSavingProgress(true);
    try {
      if (!reviewMode) await saveOnboarding("SKIPPED", step, new Date());
      toast.info(reviewMode ? "Você pode rever esta introdução quando quiser." : "Você pode retomar a introdução pelas Configurações.");
      navigate(reviewMode ? "/app/settings" : "/app", { replace: true });
    } catch (error) {
      toast.error(getFriendlyFirebaseError(error, "Não foi possível sair do onboarding."));
      setSavingProgress(false);
    }
  }

  async function completeOnboarding() {
    setSavingProgress(true);
    try {
      await saveOnboarding("COMPLETED", 4, new Date());
      toast.success("Tudo pronto para organizar sua vida financeira.", { title: "Introdução concluída" });
      navigate("/app", { replace: true });
    } catch (error) {
      toast.error(getFriendlyFirebaseError(error, "Não foi possível concluir o onboarding."));
      setSavingProgress(false);
    }
  }

  async function handleAccountCreated() {
    setCreatedAccount(true);
    setAccountModalOpen(false);
    await loadEntities();
    await goToStep(3);
  }

  async function submitCard(event: FormEvent) {
    event.preventDefault();
    if (!user || savingCard) return;
    setSavingCard(true);
    try {
      await createCard(user.uid, cardForm);
      setCreatedCard(true);
      setCardModalOpen(false);
      setCardForm(initialCardForm);
      await loadEntities();
      toast.success("Cartão criado.");
      await goToStep(4);
    } catch (error) {
      toast.error(getFriendlyFirebaseError(error, "Não foi possível salvar o cartão."));
    } finally {
      setSavingCard(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Primeiros passos</p><h2 className="mt-2 text-2xl font-semibold text-foreground">Comece com o essencial</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Uma configuração curta para deixar o FinControl pronto para uso.</p></div>
        <Button disabled={savingProgress} onClick={() => void skipOnboarding()} variant="ghost">{reviewMode ? "Fechar introdução" : "Pular por agora"}</Button>
      </div>

      <Progress step={step} />
      <Card className="mt-4 p-5 sm:p-7" as="section" aria-labelledby={`onboarding-step-${step}`}>
        {loading ? <p aria-live="polite" className="py-12 text-center text-sm text-muted-foreground">Carregando seus dados...</p> : null}
        {!loading && step === 1 ? <Introduction onStart={() => void goToStep(accounts.length ? 3 : 2)} busy={savingProgress} /> : null}
        {!loading && step === 2 ? <AccountStep accounts={accounts} busy={savingProgress} onCreate={() => setAccountModalOpen(true)} onContinue={() => void goToStep(3)} /> : null}
        {!loading && step === 3 ? <CardStep cards={cards} busy={savingProgress} onAdd={() => setCardModalOpen(true)} onSkip={() => void goToStep(4)} /> : null}
        {!loading && step === 4 ? <Completion accounts={accounts} cards={cards} createdAccount={createdAccount} createdCard={createdCard} busy={savingProgress} onComplete={() => void completeOnboarding()} /> : null}
      </Card>

      <AccountOnboardingModal isOpen={accountModalOpen} onClose={() => setAccountModalOpen(false)} onCreated={() => void handleAccountCreated()} />
      <CardFormModal busy={savingCard} editing={false} form={cardForm} isOpen={cardModalOpen} onChange={setCardForm} onClose={() => setCardModalOpen(false)} onSubmit={(event) => void submitCard(event)} />
    </div>
  );
}

function Progress({ step }: { step: OnboardingStep }) {
  return <div aria-label={`Etapa ${step} de 4`} className="rounded-control border border-border bg-surface px-4 py-3" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step}><div className="flex items-center justify-between text-xs font-medium text-muted-foreground"><span>Etapa {step} de 4</span><span>{Math.round(step / 4 * 100)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary motion-safe:transition-[width]" style={{ width: `${step / 4 * 100}%` }} /></div></div>;
}

function Introduction({ busy, onStart }: { busy: boolean; onStart: () => void }) {
  const concepts = [
    { Icon: Landmark, title: "Contas", text: "Representam onde seu dinheiro está armazenado." },
    { Icon: ReceiptText, title: "Transações", text: "Receitas, despesas e transferências atualizam seus saldos." },
    { Icon: CreditCardIcon, title: "Cartões", text: "Acompanham compras, limite e faturas; o cadastro é opcional." },
  ];
  return <><div className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="h-6 w-6" aria-hidden="true" /></span><h3 className="mt-4 text-xl font-semibold" id="onboarding-step-1">Bem-vindo ao FinControl</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Organize o que você tem, registre o que entra e sai e acompanhe suas decisões financeiras em um só lugar.</p></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{concepts.map(({ Icon, text, title }) => <div className="rounded-control border border-border bg-surface-subtle p-4" key={title}><Icon className="h-5 w-5 text-primary" aria-hidden="true" /><h4 className="mt-3 text-sm font-semibold">{title}</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>)}</div><div className="mt-7 flex justify-end"><Button loading={busy} onClick={onStart}>Começar<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></div></>;
}

function AccountStep({ accounts, busy, onContinue, onCreate }: { accounts: Account[]; busy: boolean; onContinue: () => void; onCreate: () => void }) {
  const existing = accounts[0];
  return <><div><h3 className="text-xl font-semibold" id="onboarding-step-2">{existing ? "Sua primeira conta já está pronta" : "Cadastre sua primeira conta"}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{existing ? `Encontramos “${existing.name}”. Nenhuma conta adicional será criada.` : "A conta será salva normalmente e usada em saldos, transações e transferências. O saldo inicial poderá ser ajustado depois."}</p></div>{existing ? <div className="mt-6 flex items-center gap-3 rounded-control border border-success/30 bg-success/10 p-4"><CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" /><div><p className="text-sm font-semibold">{existing.name}</p><p className="text-xs text-muted-foreground">{formatCurrencyFromCents(existing.currentBalanceInCents)}</p></div></div> : null}<div className="mt-7 flex justify-end"><Button loading={busy} onClick={existing ? onContinue : onCreate}>{existing ? "Continuar" : "Cadastrar conta"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></div></>;
}

function CardStep({ busy, cards, onAdd, onSkip }: { busy: boolean; cards: CreditCard[]; onAdd: () => void; onSkip: () => void }) {
  const existing = cards[0];
  return <><div><h3 className="text-xl font-semibold" id="onboarding-step-3">{existing ? "Seu cartão já está cadastrado" : "Deseja adicionar um cartão?"}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{existing ? `Encontramos “${existing.name}”. Você pode seguir sem criar outro.` : "O limite mostra quanto pode ser usado. O fechamento encerra as compras da fatura; o vencimento é a data de pagamento. Compras podem ser registradas depois."}</p></div>{existing ? <div className="mt-6 flex items-center gap-3 rounded-control border border-success/30 bg-success/10 p-4"><CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" /><div><p className="text-sm font-semibold">{existing.name}</p><p className="text-xs text-muted-foreground">Limite de {formatCurrencyFromCents(existing.limitInCents)}</p></div></div> : null}<div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button disabled={busy} onClick={onSkip} variant="secondary">{existing ? "Continuar" : "Agora não"}</Button>{!existing ? <Button onClick={onAdd}>Adicionar cartão</Button> : null}</div></>;
}

function Completion({ accounts, busy, cards, createdAccount, createdCard, onComplete }: { accounts: Account[]; busy: boolean; cards: CreditCard[]; createdAccount: boolean; createdCard: boolean; onComplete: () => void }) {
  return <div className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success"><CheckCircle2 className="h-6 w-6" aria-hidden="true" /></span><h3 className="mt-4 text-xl font-semibold" id="onboarding-step-4">Tudo pronto para começar</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{createdAccount ? "Sua conta foi criada" : accounts.length ? "Sua conta está configurada" : "Você pode cadastrar uma conta depois"}{createdCard ? " e seu cartão também." : cards.length ? " e seu cartão já estava disponível." : ". O cartão continua opcional."}</p><div className="mx-auto mt-6 max-w-md rounded-control border border-border bg-surface-subtle p-4 text-left"><p className="text-sm font-semibold">Próximo passo sugerido</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Registre uma receita ou despesa para começar a acompanhar seu período financeiro.</p></div><div className="mt-7 flex justify-center"><Button loading={busy} onClick={onComplete}>Ir para o início<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></div></div>;
}

function AccountOnboardingModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<AccountInput>(initialAccountForm);
  const [nameError, setNameError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const formState = useFormState(form, isOpen, busy);
  const closeGuard = useUnsavedChangesGuard({ busy, dirty: formState.dirty, onClose });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || busy) return;
    if (!form.name.trim()) { setNameError("Informe um nome para identificar a conta."); focusFirstInvalidField(["onboarding-account-name"]); return; }
    setBusy(true);
    try {
      await createAccount(user.uid, form);
      formState.markSaved(form);
      toast.success("Conta criada.");
      setForm(initialAccountForm);
      onCreated();
    } catch (error) {
      toast.error(getFriendlyFirebaseError(error, "Não foi possível salvar a conta."));
    } finally {
      setBusy(false);
    }
  }

  return <><Modal closeDisabled={busy} initialFocus="#onboarding-account-name" isOpen={isOpen} onClose={closeGuard.requestClose} title="Cadastrar primeira conta"><form className="grid gap-4" noValidate onSubmit={(event) => void submit(event)}><FormField error={nameError} id="onboarding-account-name" label="Nome"><Input id="onboarding-account-name" value={form.name} onChange={(event) => { setNameError(undefined); setForm({ ...form, name: event.target.value }); }} /></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField id="onboarding-account-type" label="Tipo"><Select id="onboarding-account-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as AccountType })}>{accountTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</Select></FormField><FormField id="onboarding-account-balance" label="Saldo inicial" hint="Você poderá ajustar este valor depois."><CurrencyInput id="onboarding-account-balance" value={formatCurrencyFromCents(form.initialBalanceInCents)} onChange={(event) => setForm({ ...form, initialBalanceInCents: parseCurrencyToCents(event.target.value) })} /></FormField></div><div className="grid gap-4 sm:grid-cols-2"><FormField id="onboarding-account-institution" label="Instituição (opcional)"><Input id="onboarding-account-institution" value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} /></FormField><FormField id="onboarding-account-color" label="Cor"><Input id="onboarding-account-color" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></FormField></div><AccountIconPicker color={form.color} disabled={busy} id="onboarding-account-icon" value={form.icon} onChange={(icon) => setForm({ ...form, icon })} /><FormActions busy={busy} onCancel={closeGuard.requestClose} status={formState.status} submitLabel="Criar conta" /></form></Modal><UnsavedChangesDialog isOpen={closeGuard.confirmationOpen} onDiscard={closeGuard.discardChanges} onKeepEditing={closeGuard.keepEditing} /></>;
}
