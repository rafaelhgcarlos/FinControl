import { AlertCircle, ArrowDownRight, ArrowUpRight, Landmark, Plus, ReceiptText, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
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
  const { profile, user } = useAuth();
  const financialMonthStartDay = profile?.financialMonthStartDay ?? 1;
  const [period, setPeriod] = useState<DashboardPeriod>(() => getDefaultDashboardPeriod(financialMonthStartDay));
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

  useEffect(() => {
    setPeriod((current) => current.preset === "month" ? resolvePeriod("month", undefined, undefined, financialMonthStartDay) : current);
  }, [financialMonthStartDay]);

  function handlePresetChange(preset: PeriodPreset) {
    setPeriod(resolvePeriod(preset, period.startDate, period.endDate, financialMonthStartDay));
  }

  function handleCustomChange(startDate: Date, endDate: Date) {
    setPeriod(resolvePeriod("custom", startDate, endDate, financialMonthStartDay));
  }

  const stats = analytics ? [
    { label: "Patrimonio disponivel", value: formatCurrencyFromCents(analytics.totalBalanceInCents), icon: Landmark, detail: `${analytics.accounts.filter((account) => account.status === "ACTIVE").length} conta(s) ativa(s)`, tone: "sky" as const },
    { label: "Resultado do periodo", value: formatCurrencyFromCents(analytics.resultInCents), icon: analytics.resultInCents >= 0 ? ArrowUpRight : ArrowDownRight, detail: analytics.savingsRate === null ? "Sem receita no periodo" : `${analytics.savingsRate.toFixed(1)}% da receita preservada`, tone: analytics.resultInCents >= 0 ? "emerald" as const : "rose" as const },
    { label: "Despesas do periodo", value: formatCurrencyFromCents(analytics.expenseInCents), icon: ReceiptText, detail: analytics.topExpenseCategory ? `Maior impacto: ${analytics.topExpenseCategory.name}` : "Sem categoria dominante", tone: "rose" as const },
  ] : [];

  return (
    <>
      <PageHeader
        eyebrow={`${formatDatePtBr(period.startDate)} - ${formatDatePtBr(period.endDate)}`}
        title={profile?.displayName ? `Ola, ${profile.displayName.split(" ")[0]}` : "Visao financeira"}
        description="Seu dinheiro em perspectiva, com os sinais que merecem atencao agora."
        action={<div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-start"><PeriodFilter period={period} onPresetChange={handlePresetChange} onCustomChange={handleCustomChange} /><div className="flex gap-2"><ThemeSwitcher /><Button asChild className="min-w-0 flex-1 xl:flex-none"><Link to="/app/transactions?new=1"><Plus className="h-4 w-4" aria-hidden="true" />Novo lancamento</Link></Button></div></div>}
      />
      {error ? <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">{error}</div> : null}
      {loading ? <LoadingState label="Carregando dashboard" /> : analytics ? (
        <div className="space-y-4 sm:space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Indicadores financeiros">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </section>

          <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]">
            <div className="space-y-4">
              <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                <IncomeExpenseChart incomeInCents={analytics.incomeInCents} expenseInCents={analytics.expenseInCents} />
                <TrendLineChart title="Evolucao financeira" data={analytics.monthlyEvolution} mode="balance" />
              </section>
              <section className="grid gap-4 xl:grid-cols-2">
                <CategorySpendingChart items={analytics.categorySpending} />
                <TrendLineChart title="Gastos no tempo" data={analytics.timeSeries} mode="expenses" />
              </section>
            </div>
            <Card className="h-fit 2xl:sticky 2xl:top-24">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">Radar financeiro</h2>
                    <p className="text-xs text-slate-500">Prioridades do periodo</p>
                  </div>
                </div>
                <Badge variant={analytics.alerts.length > 0 ? "warning" : "success"}>{analytics.alerts.length}</Badge>
              </div>
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.alerts.map((alert) => (
                  <div key={alert.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${alertClassName(alert.severity)}`}>
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{alert.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{alert.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {analytics.alerts.length === 0 ? <div className="rounded-lg bg-emerald-50 px-3 py-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">Tudo em ordem neste periodo.</div> : null}
              </div>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CompactList title="Contas" empty="Nenhuma conta ativa.">
              {analytics.accounts.filter((account) => account.status === "ACTIVE").slice(0, 5).map((account) => (
                <Row key={account.id} label={account.name} value={formatCurrencyFromCents(account.currentBalanceInCents)} />
              ))}
            </CompactList>
            <CompactList title="Faturas" empty="Nenhuma fatura em aberto." footer={formatCurrencyFromCents(analytics.upcomingInvoicesTotalInCents)}>
              {analytics.upcomingInvoices.map((invoice) => (
                <Link key={invoice.id} className="block rounded-md px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60" to={`/app/cards/${invoice.cardId}`}>
                  <Row label={invoice.cardName} detail={invoice.daysUntilDue < 0 ? `Vencida ha ${Math.abs(invoice.daysUntilDue)} dia(s)` : `Vence em ${invoice.daysUntilDue} dia(s)`} value={formatCurrencyFromCents(invoice.amountInCents)} />
                </Link>
              ))}
            </CompactList>
            <Card>
              <h2 className="text-base font-semibold">Metas</h2>
              <div className="mt-4 space-y-3">
              {analytics.goalProgress.map((goal) => (
                <div key={goal.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{goal.name}</p>
                    <span className="text-sm font-semibold">{goal.progressPercent}%</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${goal.progressPercent}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatCurrencyFromCents(goal.currentAmountInCents)} de {formatCurrencyFromCents(goal.targetAmountInCents)}</p>
                </div>
              ))}
              {analytics.goalProgress.length === 0 ? <p className="text-sm text-slate-500">Nenhuma meta ativa para acompanhar.</p> : null}
              </div>
            </Card>
          </section>
        </div>
      ) : null}
    </>
  );
}

function CompactList({ children, empty, footer, title }: { children: ReactNode; empty: string; footer?: string; title: string }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {footer ? <span className="text-sm font-semibold">{footer}</span> : null}
      </div>
      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{hasItems ? children : <p className="text-sm text-slate-500">{empty}</p>}</div>
    </Card>
  );
}

function Row({ detail, label, value }: { detail?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
      </div>
      <span className="shrink-0 text-sm font-semibold">{value}</span>
    </div>
  );
}

function alertClassName(severity: "info" | "warning" | "danger") {
  if (severity === "danger") return "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400";
  if (severity === "warning") return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  return "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400";
}
