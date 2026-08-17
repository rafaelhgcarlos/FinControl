import { Archive, Plus, Tags } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Select } from "../components/Select";
import { Table } from "../components/Table";
import { LoadingState } from "../components/LoadingState";
import { FormActions } from "../components/ui/FormActions";
import { UnsavedChangesDialog } from "../components/ui/UnsavedChangesDialog";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useActionLock } from "../hooks/useActionLock";
import { focusFirstInvalidField, useFormState, useUnsavedChangesGuard } from "../hooks/useFormState";
import { archiveCategory, createCategory, listCategories, type CategoryInput } from "../services/categoriesService";
import type { Category, CategoryType } from "../types/category";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";

const initialForm: CategoryInput = {
  name: "",
  type: "EXPENSE",
  icon: "Tag",
  color: "#2563eb",
};

export function CategoriesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { isActionPending, runAction } = useActionLock();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryInput>(initialForm);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nameError, setNameError] = useState<string>();
  const formState = useFormState(form, isOpen, isActionPending("category:save"));
  const closeGuard = useUnsavedChangesGuard({ busy: isActionPending("category:save"), dirty: formState.dirty, onClose: () => setIsOpen(false) });
  const requestClose = closeGuard.requestClose;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setCategories(await listCategories(user.uid));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadData().catch((error) => {
      toast.error(getFriendlyFirebaseError(error, "Nao foi possivel carregar categorias."));
      setLoading(false);
    });
  }, [loadData, toast]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!form.name.trim()) {
      setNameError("Informe um nome para identificar a categoria.");
      focusFirstInvalidField(["category-name"]);
      return;
    }
    await runAction("category:save", async () => {
      try {
        await createCategory(user.uid, form);
        toast.success("Categoria criada.");
        formState.markSaved(form);
        setForm(initialForm);
        setIsOpen(false);
        await loadData();
      } catch (error) {
        toast.error(getFriendlyFirebaseError(error, "Nao foi possivel salvar a categoria."));
      }
    });
  }

  async function handleArchive(category: Category) {
    if (!window.confirm("Arquivar esta categoria? Lancamentos antigos continuarao com historico preservado.")) return;
    await runAction(`category:archive:${category.id}`, async () => {
      try {
        await archiveCategory(category.id);
        toast.success("Categoria arquivada.");
        await loadData();
      } catch (error) {
        toast.error(getFriendlyFirebaseError(error, "Nao foi possivel arquivar a categoria."));
      }
    });
  }

  return (
    <>
      <PageHeader title="Categorias" description="Use categorias padrao e personalize sua organizacao." action={<Button disabled={isActionPending()} onClick={() => setIsOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" />Nova categoria</Button>} />
      <Card>
        {loading ? <LoadingState label="Carregando categorias" /> : categories.length === 0 ? (
          <EmptyState action={<Button disabled={isActionPending()} onClick={() => setIsOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" />Criar categoria</Button>} title="Nenhuma categoria" description="As categorias padrão são criadas automaticamente, e você também pode personalizar sua organização." icon={<Tags className="h-6 w-6" aria-hidden="true" />} />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {categories.map((category) => (
                <div key={category.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />{category.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{category.type === "INCOME" ? "Receita" : "Despesa"}</p>
                    </div>
                    <Badge>{category.isDefault ? "Padrao" : "Personalizada"}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Badge variant={category.status === "ACTIVE" ? "success" : "neutral"}>{category.status === "ACTIVE" ? "Ativa" : "Arquivada"}</Badge>
                    {category.status === "ACTIVE" ? <Button aria-label="Arquivar categoria" className="px-2" disabled={isActionPending()} variant="ghost" onClick={() => void handleArchive(category)}><Archive className="h-4 w-4" aria-hidden="true" /></Button> : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="px-3 py-2">Categoria</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Origem</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-3 py-3"><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />{category.name}</span></td>
                      <td className="px-3 py-3">{category.type === "INCOME" ? "Receita" : "Despesa"}</td>
                      <td className="px-3 py-3"><Badge>{category.isDefault ? "Padrao" : "Personalizada"}</Badge></td>
                      <td className="px-3 py-3"><Badge variant={category.status === "ACTIVE" ? "success" : "neutral"}>{category.status === "ACTIVE" ? "Ativa" : "Arquivada"}</Badge></td>
                      <td className="px-3 py-3 text-right">{category.status === "ACTIVE" ? <Button aria-label="Arquivar categoria" disabled={isActionPending()} variant="ghost" onClick={() => void handleArchive(category)}><Archive className="h-4 w-4" aria-hidden="true" /></Button> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Card>
      <Modal closeDisabled={isActionPending("category:save")} initialFocus="#category-name" isOpen={isOpen} title="Nova categoria" onClose={requestClose}>
        <form className="grid gap-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <FormField error={nameError} id="category-name" label="Nome"><Input id="category-name" required value={form.name} onChange={(event) => { setNameError(undefined); setForm({ ...form, name: event.target.value }); }} /></FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="category-type" label="Tipo"><Select id="category-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as CategoryType })}><option value="INCOME">Receita</option><option value="EXPENSE">Despesa</option></Select></FormField>
            <FormField id="category-color" label="Cor"><Input id="category-color" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></FormField>
            <FormField id="category-icon" label="Icone"><Input id="category-icon" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} /></FormField>
          </div>
          <FormActions busy={isActionPending("category:save")} onCancel={requestClose} status={formState.status} />
        </form>
      </Modal>
      <UnsavedChangesDialog isOpen={closeGuard.confirmationOpen} onDiscard={closeGuard.discardChanges} onKeepEditing={closeGuard.keepEditing} />
    </>
  );
}
