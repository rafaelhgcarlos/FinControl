import { BarChart3, CreditCard, Landmark, PlusCircle, ReceiptText } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { ThemeSwitcher } from "../features/preferences/components/ThemeSwitcher";
import { formatCurrencyFromCents } from "../utils/money";

const stats = [{ label: "Saldo consolidado", value: formatCurrencyFromCents(0), icon: Landmark }, { label: "Receitas do mês", value: formatCurrencyFromCents(0), icon: BarChart3 }, { label: "Despesas do mês", value: formatCurrencyFromCents(0), icon: ReceiptText }, { label: "Faturas abertas", value: formatCurrencyFromCents(0), icon: CreditCard }];

export function DashboardPage() {
  return <><PageHeader eyebrow="America/Sao_Paulo · BRL" title="Visão geral" description="Acompanhe seu dinheiro e tome decisões com mais clareza." action={<div className="flex items-center gap-2"><ThemeSwitcher /><Button type="button"><PlusCircle className="h-4 w-4" aria-hidden="true" />Novo lançamento</Button></div>} /><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo financeiro">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</section><section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]"><Card><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-semibold">Lançamentos recentes</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Suas movimentações aparecerão aqui.</p></div><Badge variant="neutral">MVP</Badge></div><EmptyState title="Nenhum lançamento cadastrado" description="Adicione sua primeira receita ou despesa para começar a acompanhar o saldo." /></Card><Card><h2 className="text-base font-semibold">Próximos passos</h2><ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300"><li>Cadastre suas contas e cartões.</li><li>Registre receitas, despesas e transferências.</li><li>Defina uma meta para acompanhar seu progresso.</li></ul></Card></section></>;
}
