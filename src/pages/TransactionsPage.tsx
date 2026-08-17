import { Edit2, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DocumentSnapshot } from "firebase/firestore";
import { Badge } from "../components/Badge";
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
import { Toast } from "../components/Toast";
import { LoadingState } from "../components/LoadingState";
import { TransactionForm } from "../components/TransactionForm";
import { useAuth } from "../contexts/AuthContext";
import { useActionLock } from "../hooks/useActionLock";
import { listAccounts } from "../services/accountsService";
import { listCategories } from "../services/categoriesService";
import { createTransaction, deleteTransaction, listTransactionsPage, updateTransaction, type TransactionInput } from "../services/transactionsService";
import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { Transaction, TransactionFilters, TransactionType } from "../types/transaction";
import { formatDatePtBr, toDateInputValue } from "../utils/date";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { formatCurrencyFromCents, parseCurrencyToCents } from "../utils/money";

function createInitialForm(type: TransactionType = "EXPENSE"): TransactionInput {
  const today = toDateInputValue(new Date());
  return {
    amountInCents: 0,
    type,
    categoryId: "",
    accountId: "",
    destinationAccountId: "",
    date: new Date(`${today}T12:00:00.000Z`),
    description: "",
  };
}

function requestedTransactionType(value: string | null): TransactionType {
  return value === "INCOME" || value === "TRANSFER" ? value : "EXPENSE";
}

export function TransactionsPage() {
  const { user } = useAuth();
  const { isActionPending, runAction } = useActionLock();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({ type: "ALL" });
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [form, setForm] = useState<TransactionInput>(() => createInitialForm(requestedTransactionType(searchParams.get("type"))));
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [isOpen, setIsOpen] = useState(searchParams.get("new") === "1");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const activeAccounts = useMemo(() => accounts.filter((account) => account.status === "ACTIVE"), [accounts]);
  const activeCategories = useMemo(() => categories.filter((category) => category.status === "ACTIVE" && category.type === form.type), [categories, form.type]);
  const hasActiveFilters = Boolean(
    filters.startDate
      || filters.endDate
      || (filters.type && filters.type !== "ALL")
      || filters.accountId
      || filters.categoryId
      || filters.minAmountInCents !== undefined
      || filters.search?.trim(),
  );

  const loadSupportData = useCallback(async () => {
    if (!user) return;
    const [nextAccounts, nextCategories] = await Promise.all([listAccounts(user.uid), listCategories(user.uid)]);
    setAccounts(nextAccounts);
    setCategories(nextCategories);
    setForm((current) => ({
      ...current,
      accountId: current.accountId || nextAccounts.find((account) => account.status === "ACTIVE")?.id || "",
      categoryId: current.categoryId || nextCategories.find((category) => category.status === "ACTIVE" && category.type === current.type)?.id || "",
    }));
  }, [user]);

  const loadTransactions = useCallback(async (mode: "reset" | "append" = "reset", nextCursor: DocumentSnapshot | null = null) => {
    if (!user) return;
    setLoading(true);
    const page = await listTransactionsPage(user.uid, filters, 25, mode === "append" ? nextCursor : null);
    setTransactions((current) => mode === "append" ? [...current, ...page.items] : page.items);
    setCursor(page.lastDoc);
    setHasMore(page.hasMore);
    setLoading(false);
  }, [filters, user]);

  useEffect(() => {
    void loadSupportData().catch((error) => setMessage(getFriendlyFirebaseError(error, "Nao foi possivel carregar contas e categorias.")));
  }, [loadSupportData]);

  useEffect(() => {
    void loadTransactions("reset").catch((error) => {
      setMessage(getFriendlyFirebaseError(error, "Nao foi possivel carregar o historico."));
      setLoading(false);
    });
  }, [loadTransactions]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const type = requestedTransactionType(searchParams.get("type"));
      setEditing(null);
      setForm({
        ...createInitialForm(type),
        accountId: activeAccounts[0]?.id ?? "",
        categoryId: categories.find((category) => category.status === "ACTIVE" && category.type === type)?.id ?? "",
      });
      setIsOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [activeAccounts, categories, searchParams, setSearchParams]);

  function openCreate() {
    const nextForm = createInitialForm();
    setEditing(null);
    setForm({
      ...nextForm,
      accountId: activeAccounts[0]?.id ?? "",
      categoryId: categories.find((category) => category.status === "ACTIVE" && category.type === nextForm.type)?.id ?? "",
    });
    setIsOpen(true);
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction);
    setForm({
      amountInCents: transaction.amountInCents,
      type: transaction.type,
      categoryId: transaction.categoryId ?? "",
      accountId: transaction.accountId,
      destinationAccountId: transaction.destinationAccountId ?? "",
      date: transaction.date,
      description: transaction.description ?? "",
    });
    setIsOpen(true);
  }

  async function handleSubmit() {
    if (!user) return;
    await runAction("transaction:save", async () => {
      try {
        if (editing) {
          await updateTransaction(editing.id, form, accounts, categories, user.uid);
          setMessage("Lancamento atualizado.");
        } else {
          await createTransaction(user.uid, form, accounts, categories);
          setMessage("Lancamento criado.");
        }
        setIsOpen(false);
        await loadTransactions("reset");
      } catch (error) {
        setMessage(getFriendlyFirebaseError(error, "Nao foi possivel salvar o lancamento."));
      }
    });
  }

  async function handleDelete(transaction: Transaction) {
    if (!window.confirm("Excluir este lancamento? O saldo sera recalculado a partir do historico restante.")) return;
    await runAction(`transaction:delete:${transaction.id}`, async () => {
      try {
        await deleteTransaction(transaction.id);
        setMessage("Lancamento excluido.");
        await loadTransactions("reset");
      } catch (error) {
        setMessage(getFriendlyFirebaseError(error, "Nao foi possivel excluir o lancamento."));
      }
    });
  }

  function setFormType(type: TransactionType) {
    setForm({
      ...form,
      type,
      categoryId: categories.find((category) => category.status === "ACTIVE" && category.type === type)?.id ?? "",
      destinationAccountId: type === "TRANSFER" ? form.destinationAccountId : "",
    });
  }

  return (
    <>
      <PageHeader title="Transações" description="Registre receitas, despesas e transferências sem carregar todo o histórico." action={<Button disabled={isActionPending()} onClick={openCreate}><Plus className="h-4 w-4" aria-hidden="true" />Novo lançamento</Button>} />
      {message ? <div className="mb-4"><Toast>{message}</Toast></div> : null}
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          <FormField id="filter-start" label="Inicio"><Input id="filter-start" type="date" value={filters.startDate ? toDateInputValue(filters.startDate) : ""} onChange={(event) => setFilters({ ...filters, startDate: event.target.value ? new Date(`${event.target.value}T00:00:00.000Z`) : undefined })} /></FormField>
          <FormField id="filter-end" label="Fim"><Input id="filter-end" type="date" value={filters.endDate ? toDateInputValue(filters.endDate) : ""} onChange={(event) => setFilters({ ...filters, endDate: event.target.value ? new Date(`${event.target.value}T23:59:59.999Z`) : undefined })} /></FormField>
          <FormField id="filter-type" label="Tipo"><Select id="filter-type" value={filters.type ?? "ALL"} onChange={(event) => setFilters({ ...filters, type: event.target.value as TransactionFilters["type"] })}><option value="ALL">Todos</option><option value="INCOME">Receita</option><option value="EXPENSE">Despesa</option><option value="TRANSFER">Transferencia</option></Select></FormField>
          <FormField id="filter-account" label="Conta"><Select id="filter-account" value={filters.accountId ?? ""} onChange={(event) => setFilters({ ...filters, accountId: event.target.value || undefined })}><option value="">Todas</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></FormField>
          <FormField id="filter-category" label="Categoria"><Select id="filter-category" value={filters.categoryId ?? ""} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value || undefined })}><option value="">Todas</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></FormField>
          <FormField id="filter-min" label="Valor min."><CurrencyInput id="filter-min" value={filters.minAmountInCents === undefined ? "" : formatCurrencyFromCents(filters.minAmountInCents)} onChange={(event) => setFilters({ ...filters, minAmountInCents: parseCurrencyToCents(event.target.value) || undefined })} /></FormField>
          <FormField id="filter-search" label="Descricao"><Input id="filter-search" placeholder="Pesquisar" value={filters.search ?? ""} onChange={(event) => setFilters({ ...filters, search: event.target.value || undefined })} /></FormField>
        </div>
      </Card>
      <Card>
        {loading && transactions.length === 0 ? <LoadingState label="Carregando historico" /> : transactions.length === 0 ? (
          <EmptyState
            action={hasActiveFilters
              ? <Button onClick={() => setFilters({ type: "ALL" })} variant="secondary">Limpar filtros</Button>
              : <Button disabled={isActionPending()} onClick={openCreate}><Plus className="h-4 w-4" aria-hidden="true" />Criar lançamento</Button>}
            title={hasActiveFilters ? "Nenhum resultado" : "Nenhum lançamento"}
            description={hasActiveFilters ? "Não encontramos lançamentos com os filtros atuais." : "Registre sua primeira movimentação para começar o histórico."}
            icon={<ReceiptText className="h-6 w-6" aria-hidden="true" />}
          />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {transactions.map((transaction) => {
                const account = accounts.find((item) => item.id === transaction.accountId);
                const destination = accounts.find((item) => item.id === transaction.destinationAccountId);
                const category = categories.find((item) => item.id === transaction.categoryId);
                return (
                  <div key={transaction.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{transaction.description || "Sem descricao"}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDatePtBr(transaction.date)} - {transaction.type === "TRANSFER" ? `${account?.name ?? "-"} -> ${destination?.name ?? "-"}` : account?.name ?? "-"}</p>
                      </div>
                      <Badge variant={transaction.type === "INCOME" ? "success" : transaction.type === "EXPENSE" ? "danger" : "neutral"}>{transaction.type === "INCOME" ? "Receita" : transaction.type === "EXPENSE" ? "Despesa" : "Transferencia"}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{formatCurrencyFromCents(transaction.amountInCents)}</p>
                        <p className="text-xs text-slate-500">{transaction.type === "TRANSFER" ? "Sem categoria" : category?.name ?? "-"}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button aria-label="Editar" className="px-2" disabled={isActionPending()} variant="ghost" onClick={() => openEdit(transaction)}><Edit2 className="h-4 w-4" aria-hidden="true" /></Button>
                        <Button aria-label="Excluir" className="px-2" disabled={isActionPending()} variant="ghost" onClick={() => void handleDelete(transaction)}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Descricao</th>
                    <th className="px-3 py-2">Categoria</th>
                    <th className="px-3 py-2">Conta</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Valor</th>
                    <th className="px-3 py-2 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const account = accounts.find((item) => item.id === transaction.accountId);
                    const destination = accounts.find((item) => item.id === transaction.destinationAccountId);
                    const category = categories.find((item) => item.id === transaction.categoryId);
                    return (
                      <tr key={transaction.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                        <td className="px-3 py-3">{formatDatePtBr(transaction.date)}</td>
                        <td className="px-3 py-3">{transaction.description || "-"}</td>
                        <td className="px-3 py-3">{transaction.type === "TRANSFER" ? "-" : category?.name ?? "-"}</td>
                        <td className="px-3 py-3">{transaction.type === "TRANSFER" ? `${account?.name ?? "-"} -> ${destination?.name ?? "-"}` : account?.name ?? "-"}</td>
                        <td className="px-3 py-3"><Badge variant={transaction.type === "INCOME" ? "success" : transaction.type === "EXPENSE" ? "danger" : "neutral"}>{transaction.type === "INCOME" ? "Receita" : transaction.type === "EXPENSE" ? "Despesa" : "Transferencia"}</Badge></td>
                        <td className="px-3 py-3 font-medium">{formatCurrencyFromCents(transaction.amountInCents)}</td>
                        <td className="px-3 py-3"><div className="flex justify-end gap-2"><Button aria-label="Editar" disabled={isActionPending()} variant="ghost" onClick={() => openEdit(transaction)}><Edit2 className="h-4 w-4" aria-hidden="true" /></Button><Button aria-label="Excluir" disabled={isActionPending()} variant="ghost" onClick={() => void handleDelete(transaction)}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
            {hasMore ? <div className="mt-4 flex justify-center"><Button variant="secondary" onClick={() => void loadTransactions("append", cursor)} disabled={loading}>Carregar mais</Button></div> : null}
          </>
        )}
      </Card>
      <Modal isOpen={isOpen} title={editing ? "Editar lançamento" : "Novo lançamento"} onClose={() => setIsOpen(false)}>
        <TransactionForm
          accounts={activeAccounts}
          categories={activeCategories}
          form={form}
          onCancel={() => setIsOpen(false)}
          onChange={setForm}
          onSubmit={handleSubmit}
          onTypeChange={setFormType}
          submitting={isActionPending("transaction:save")}
        />
      </Modal>
    </>
  );
}
