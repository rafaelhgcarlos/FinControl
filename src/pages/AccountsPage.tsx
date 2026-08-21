import { Edit2, Landmark, Plus, Archive } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Badge } from "../components/Badge";
import { AccountIcon, AccountIconPicker } from "../components/AccountIconPicker";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CurrencyInput } from "../components/CurrencyInput";
import { EmptyState } from "../components/EmptyState";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Select } from "../components/Select";
import { Table } from "../components/Table";
import { TableSkeleton } from "../components/ui/Skeleton";
import { FormActions } from "../components/ui/FormActions";
import { IconButton } from "../components/ui/IconButton";
import { UnsavedChangesDialog } from "../components/ui/UnsavedChangesDialog";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useActionLock } from "../hooks/useActionLock";
import { focusFirstInvalidField, useFormState, useUnsavedChangesGuard } from "../hooks/useFormState";
import { accountTypes, archiveAccount, createAccount, listAccounts, updateAccount, type AccountInput } from "../services/accountsService";
import type { Account, AccountStatus, AccountType } from "../types/account";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { formatCurrencyFromCents, parseCurrencyToCents } from "../utils/money";

const initialForm: AccountInput = {
  name: "",
  type: "CHECKING",
  initialBalanceInCents: 0,
  institution: "",
  color: "#059669",
  icon: "Landmark",
  status: "ACTIVE",
};

export function AccountsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { isActionPending, runAction } = useActionLock();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<AccountInput>(initialForm);
  const [editing, setEditing] = useState<Account | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nameError, setNameError] = useState<string>();
  const formState = useFormState(form, isOpen, isActionPending("account:save"));
  const closeGuard = useUnsavedChangesGuard({ busy: isActionPending("account:save"), dirty: formState.dirty, onClose: () => setIsOpen(false) });
  const requestClose = closeGuard.requestClose;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setAccounts(await listAccounts(user.uid));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadData().catch((error) => {
      toast.error(getFriendlyFirebaseError(error, "Nao foi possivel carregar as contas."));
      setLoading(false);
    });
  }, [loadData, toast]);

  const rows = useMemo(() => accounts.map((account) => ({
    account,
    balance: account.currentBalanceInCents,
    typeLabel: accountTypes.find((type) => type.value === account.type)?.label ?? account.type,
  })), [accounts]);

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setIsOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      name: account.name,
      type: account.type,
      initialBalanceInCents: account.initialBalanceInCents,
      institution: account.institution ?? "",
      color: account.color,
      icon: account.icon,
      status: account.status,
    });
    setIsOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!form.name.trim()) { setNameError("Informe um nome para identificar a conta."); focusFirstInvalidField(["account-name"]); return; }
    await runAction("account:save", async () => {
      try {
        if (editing) {
          await updateAccount(editing.id, form);
          toast.success("Conta atualizada.");
        } else {
          await createAccount(user.uid, form);
          toast.success("Conta criada.");
        }
        formState.markSaved(form);
        setIsOpen(false);
        await loadData();
      } catch (error) {
        toast.error(getFriendlyFirebaseError(error, "Nao foi possivel salvar a conta."));
      }
    });
  }

  async function handleArchive(account: Account) {
    if (!window.confirm("Arquivar esta conta? O historico sera preservado.")) return;
    await runAction(`account:archive:${account.id}`, async () => {
      try {
        await archiveAccount(account.id);
        toast.success("Conta arquivada.");
        await loadData();
      } catch (error) {
        toast.error(getFriendlyFirebaseError(error, "Nao foi possivel arquivar a conta."));
      }
    });
  }

  return (
    <>
      <PageHeader title="Contas" description="Cadastre contas e reconcilie saldos com os lancamentos." action={<Button disabled={isActionPending()} onClick={openCreate}><Plus className="h-4 w-4" aria-hidden="true" />Nova conta</Button>} />
      <Card>
        {loading ? <TableSkeleton label="Carregando contas" /> : rows.length === 0 ? (
          <EmptyState action={<Button disabled={isActionPending()} onClick={openCreate}><Plus className="h-4 w-4" aria-hidden="true" />Criar primeira conta</Button>} title="Nenhuma conta cadastrada" description="Crie sua primeira conta para registrar movimentacoes." icon={<Landmark className="h-6 w-6" aria-hidden="true" />} />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {rows.map(({ account, balance, typeLabel }) => (
                <div key={account.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium"><AccountIcon className="h-8 w-8" color={account.color} name={account.icon} />{account.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{typeLabel} - {account.institution || "Sem instituicao"}</p>
                    </div>
                    <Badge variant={account.status === "ACTIVE" ? "success" : "neutral"}>{account.status === "ACTIVE" ? "Ativa" : "Arquivada"}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold">{formatCurrencyFromCents(balance)}</p>
                    <div className="flex gap-1">
                      <IconButton aria-label="Editar conta" disabled={isActionPending()} onClick={() => openEdit(account)}><Edit2 aria-hidden="true" /></IconButton>
                      {account.status === "ACTIVE" ? <IconButton aria-label="Arquivar conta" disabled={isActionPending()} onClick={() => void handleArchive(account)}><Archive aria-hidden="true" /></IconButton> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="px-3 py-2">Conta</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Instituicao</th>
                    <th className="px-3 py-2">Saldo</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ account, balance, typeLabel }) => (
                    <tr key={account.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-3 py-3"><span className="inline-flex items-center gap-2"><AccountIcon className="h-8 w-8" color={account.color} name={account.icon} />{account.name}</span></td>
                      <td className="px-3 py-3">{typeLabel}</td>
                      <td className="px-3 py-3">{account.institution || "-"}</td>
                      <td className="px-3 py-3 font-medium">{formatCurrencyFromCents(balance)}</td>
                      <td className="px-3 py-3"><Badge variant={account.status === "ACTIVE" ? "success" : "neutral"}>{account.status === "ACTIVE" ? "Ativa" : "Arquivada"}</Badge></td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <IconButton aria-label="Editar conta" disabled={isActionPending()} onClick={() => openEdit(account)}><Edit2 aria-hidden="true" /></IconButton>
                          {account.status === "ACTIVE" ? <IconButton aria-label="Arquivar conta" disabled={isActionPending()} onClick={() => void handleArchive(account)}><Archive aria-hidden="true" /></IconButton> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Card>
      <Modal closeDisabled={isActionPending("account:save")} initialFocus="#account-name" isOpen={isOpen} title={editing ? "Editar conta" : "Nova conta"} onClose={requestClose}>
        <form className="grid gap-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <FormField error={nameError} id="account-name" label="Nome"><Input id="account-name" required value={form.name} onChange={(event) => { setNameError(undefined); setForm({ ...form, name: event.target.value }); }} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="account-type" label="Tipo"><Select id="account-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as AccountType })}>{accountTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</Select></FormField>
            <FormField id="account-status" label="Status"><Select id="account-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AccountStatus })}><option value="ACTIVE">Ativa</option><option value="ARCHIVED">Arquivada</option></Select></FormField>
          </div>
          <FormField id="account-balance" label="Saldo inicial"><CurrencyInput id="account-balance" value={formatCurrencyFromCents(form.initialBalanceInCents)} onChange={(event) => setForm({ ...form, initialBalanceInCents: parseCurrencyToCents(event.target.value) })} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="account-institution" label="Instituicao"><Input id="account-institution" value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} /></FormField>
            <FormField id="account-color" label="Cor"><Input id="account-color" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></FormField>
          </div>
          <AccountIconPicker color={form.color} disabled={isActionPending("account:save")} id="account-icon" value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
          <FormActions busy={isActionPending("account:save")} onCancel={requestClose} status={formState.status} />
        </form>
      </Modal>
      <UnsavedChangesDialog isOpen={closeGuard.confirmationOpen} onDiscard={closeGuard.discardChanges} onKeepEditing={closeGuard.keepEditing} />
    </>
  );
}
