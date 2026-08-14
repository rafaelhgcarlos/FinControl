import { AlertTriangle, BarChart3, Landmark, Percent, PlusCircle, ReceiptText, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CategorySpendingChart, IncomeExpenseChart, TrendLineChart } from "../components/FinancialCharts";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { PeriodFilter } from "../components/PeriodFilter";
import { StatCard } from "../components/StatCard";
import { useAuth } from "../contexts/AuthContext";
import { ThemeSwitcher } from "../features/preferences/components/ThemeSwitcher";
import { getDefaultDashboardPeriod, getFinancialAnalytics, resolvePeriod, type DashboardPeriod, type FinancialAnalytics, type PeriodPreset } from "../services/analyticsService";
import { formatDatePtBr } from "../utils/date";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { formatCurrencyFromCents } from "../utils/money";

export function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>(getDefaultDashboardPeriod);
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setAnalytics(await getFinancialAnalytics(user.uid, period));
      setError(null);
    } catch (reason) {
      setError(getFriendlyFirebaseError(reason, "Nao foi possivel carregar o dashboard."));
    } finally {
      setLoading(false);
    }
  }, [period, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function handlePresetChange(preset: PeriodPreset) {
    setPeriod(resolvePeriod(preset, period.startDate, period.endDate));
  }

  function handleCustomChange(startDate: Date, endDate: Date) {
    setPeriod(resolvePeriod("custom", startDate, endDate));
  }

  const stats = analytics ? [
    { label: "Saldo total", value: formatCurrencyFromCents(analytics.totalBalanceInCents), icon: Landmark },
    { label: "Receitas", value: formatCurrencyFromCents(analytics.incomeInCents), icon: TrendingUp },
    { label: "Despesas", value: formatCurrencyFromCents(analytics.expenseInCents), icon: ReceiptText },
    { label: "Resultado", value: formatCurrencyFromCents(analytics.resultInCents), icon: BarChart3 },
    { label: "Media de gastos", value: formatCurrencyFromCents(analytics.averageExpenseInCents), icon: ReceiptText },
    { label: "Maior despesa", value: formatCurrencyFromCents(analytics.largestExpense?.amountInCents ?? 0), icon: AlertTriangle },
    { label: "Maior categoria", value: analytics.topExpenseCategory?.name ?? "-", icon: BarChart3 },
    { label: "Economia", value: analytics.savingsRate === null ? "-" : `${analytics.savingsRate.toFixed(1)}%`, icon: Percent },
  ] : [];

  return (
    <>
      <PageHeader
        eyebrow={`${formatDatePtBr(period.startDate)} - ${formatDatePtBr(period.endDate)}`}
        title="Visao financeira"
        description="Resumo do periodo, indicadores, alertas e evolucao financeira."
        action={<div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-start"><PeriodFilter period={period} onPresetChange={handlePresetChange} onCustomChange={handleCustomChange} /><div className="flex gap-2"><ThemeSwitcher /><Button asChild><Link to="/app/transactions?new=1"><PlusCircle className="h-4 w-4" aria-hidden="true" />Novo lancamento</Link></Button></div></div>}
      />
      {error ? <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">{error}</div> : null}
      {loading ? <LoadingState label="Carregando dashboard" /> : analytics ? (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores financeiros">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <IncomeExpenseChart incomeInCents={analytics.incomeInCents} expenseInCents={analytics.expenseInCents} />
            <CategorySpendingChart items={analytics.categorySpending} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <TrendLineChart title="Evolucao financeira" data={analytics.monthlyEvolution} mode="balance" />
            <TrendLineChart title="Gastos no tempo" data={analytics.timeSeries} mode="expenses" />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <Card>
              <h2 className="text-base font-semibold">Contas ativas</h2>
              <div className="mt-4 space-y-2">
                {analytics.accounts.filter((account) => account.status === "ACTIVE").slice(0, 6).map((account) => (
                  <div key={account.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <span className="truncate text-sm">{account.name}</span>
                    <span className="shrink-0 text-sm font-semibold">{formatCurrencyFromCents(account.currentBalanceInCents)}</span>
                  </div>
                ))}
                {analytics.accounts.length === 0 ? <p className="text-sm text-slate-500">Nenhuma conta cadastrada.</p> : null}
              </div>
            </Card>
            <Card>
              <h2 className="text-base font-semibold">Proximas despesas</h2>
              <div className="mt-4 space-y-2">
                {analytics.upcomingExpenses.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{transaction.description || "Despesa"}</p>
                      <p className="text-xs text-slate-500">{formatDatePtBr(transaction.date)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">{formatCurrencyFromCents(transaction.amountInCents)}</span>
                  </div>
                ))}
                {analytics.upcomingExpenses.length === 0 ? <p className="text-sm text-slate-500">Nenhuma despesa futura no periodo.</p> : null}
              </div>
            </Card>
            <Card>
              <h2 className="text-base font-semibold">Alertas</h2>
              <div className="mt-4 space-y-2">
                {analytics.alerts.map((alert) => (
                  <div key={alert} className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{alert}</span>
                  </div>
                ))}
                {analytics.alerts.length === 0 ? <Badge variant="success">Sem alertas no periodo</Badge> : null}
              </div>
            </Card>
          </section>

          <Card>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">Proximas faturas</h2>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatCurrencyFromCents(analytics.upcomingInvoicesTotalInCents)}</span>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {analytics.upcomingInvoices.map((invoice) => (
                <Link key={invoice.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60" to={`/app/cards/${invoice.cardId}`}>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{invoice.cardName}</p>
                    <p className={`text-xs ${invoice.daysUntilDue < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-500"}`}>{invoice.daysUntilDue < 0 ? `Vencida ha ${Math.abs(invoice.daysUntilDue)} dia(s)` : `Vence em ${invoice.daysUntilDue} dia(s)`}</p>
                  </div>
                  <span className="shrink-0 font-semibold">{formatCurrencyFromCents(invoice.amountInCents)}</span>
                </Link>
              ))}
              {analytics.upcomingInvoices.length === 0 ? <p className="text-sm text-slate-500">Nenhuma fatura em aberto.</p> : null}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold">Metas</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {analytics.goalProgress.map((goal) => (
                <div key={goal.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{goal.name}</p>
                    <span className="text-sm font-semibold">{goal.progressPercent}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${goal.progressPercent}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatCurrencyFromCents(goal.currentAmountInCents)} de {formatCurrencyFromCents(goal.targetAmountInCents)}</p>
                </div>
              ))}
              {analytics.goalProgress.length === 0 ? <p className="text-sm text-slate-500">Nenhuma meta ativa para acompanhar.</p> : null}
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
