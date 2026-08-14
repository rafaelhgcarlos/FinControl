import { ArrowRight, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";

export function FeaturePage({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={<Button disabled variant="secondary"><Plus className="h-4 w-4" aria-hidden="true" />Novo</Button>}
      />
      <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</p>
              <h2 className="mt-1 text-xl font-semibold">Modulo preparado</h2>
            </div>
            <Badge variant="neutral">Em breve</Badge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs text-slate-500">Itens ativos</p>
              <p className="mt-1 text-2xl font-semibold">0</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs text-slate-500">Pendencias</p>
              <p className="mt-1 text-2xl font-semibold">0</p>
            </div>
          </div>
        </Card>
        <Card>
          <EmptyState
            title={`Nenhum dado em ${title.toLowerCase()}`}
            description="Quando este modulo for ativado, os registros aparecerao aqui com filtros e acoes dedicadas."
            icon={<Icon className="h-6 w-6" aria-hidden="true" />}
          />
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button disabled variant="secondary">Configurar modulo<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </Card>
      </section>
    </>
  );
}
