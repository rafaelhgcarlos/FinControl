import { AlertTriangle, BarChart3, FileText, Percent, ReceiptText, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CategorySpendingChart, IncomeExpenseChart, TrendLineChart } from "../components/FinancialCharts";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { PeriodFilter } from "../components/PeriodFilter";
import { StatCard } from "../components/StatCard";
import { Table } from "../components/Table";
import { useAuth } from "../contexts/AuthContext";
import { getDefaultDashboardPeriod, getFinancialAnalytics, resolvePeriod, type DashboardPeriod, type FinancialAnalytics, type PeriodPreset } from "../services/analyticsService";
import { rebuildMonthlySummaries } from "../services/monthlySummariesService";
import { formatDatePtBr } from "../utils/date";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { formatCurrencyFromCents, formatSignedCurrencyFromCents } from "../utils/money";

export function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>(getDefaultDashboardPeriod);
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setAnalytics(await getFinancialAnalytics(user.uid, period));
      setError(null);
    } catch (reason) {
      setError(getFriendlyFirebaseError(reason, "Nao foi possivel carregar os relatorios."));
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

  function exportCsv() {
    if (!analytics) return;
    const rows = [
      ["Data", "Tipo", "Descricao", "Valor"],
      ...analytics.transactions.map((transaction) => [
        formatDatePtBr(transaction.date),
        transaction.type,
        transaction.description || "",
        (transaction.amountInCents / 100).toFixed(2).replace(".", ","),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fincontrol-relatorio-${period.startDate.toISOString().slice(0, 10)}-${period.endDate.toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function reconcileSummaries() {
    if (!user) return;
    setReconciling(true);
    try {
      await rebuildMonthlySummaries(user.uid, period.startDate, period.endDate);
      await loadData();
      setError(null);
    } catch (reason) {
      setError(getFriendlyFirebaseError(reason, "Nao foi possivel reconciliar os resumos."));
    } finally {
      setReconciling(false);
    }
  }

  const indicators = analytics ? [
    { label: "Receita total", value: formatCurrencyFromCents(analytics.incomeInCents), icon: TrendingUp },
    { label: "Despesa total", value: formatCurrencyFromCents(analytics.expenseInCents), icon: ReceiptText },
    { label: "Resultado liquido", value: formatCurrencyFromCents(analytics.resultInCents), icon: BarChart3 },
    { label: "Comprometimento", value: analytics.incomeCommitmentRate === null ? "-" : `${analytics.incomeCommitmentRate.toFixed(1)}%`, icon: Percent },
    { label: "Media de gastos", value: formatCurrencyFromCents(analytics.averageExpenseInCents), icon: ReceiptText },
    { label: "Maior despesa", value: formatCurrencyFromCents(analytics.largestExpense?.amountInCents ?? 0), detail: analytics.largestExpense?.description ?? "-", icon: AlertTriangle },
    { label: "Categoria com maior gasto", value: analytics.topExpenseCategory?.name ?? "-", icon: BarChart3 },
    { label: "Economia", value: analytics.savingsRate === null ? "-" : `${analytics.savingsRate.toFixed(1)}%`, icon: Percent },
  ] : [];

  return (
    <>
      <PageHeader
        eyebrow={`${formatDatePtBr(period.startDate)} - ${formatDatePtBr(period.endDate)}`}
        title="Relatorios"
        description="Analise receitas, despesas, categorias e evolucao financeira por periodo."
        action={<div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-start"><PeriodFilter period={period} onPresetChange={handlePresetChange} onCustomChange={handleCustomChange} /><div className="flex gap-2"><Button disabled={reconciling || !analytics} onClick={() => void reconcileSummaries()} variant="secondary">{reconciling ? "Reconciliando..." : "Reconciliar"}</Button><Button disabled={!analytics || analytics.transactions.length === 0} onClick={exportCsv} variant="secondary">CSV</Button><Button disabled={!analytics} onClick={() => window.print()} variant="secondary">PDF</Button></div></div>}
      />
      {error ? <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">{error}</div> : null}
      {loading ? <LoadingState label="Carregando relatorios" /> : analytics ? (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de relatorio">
            {indicators.map((indicator) => <StatCard key={indicator.label} {...indicator} />)}
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <IncomeExpenseChart incomeInCents={analytics.incomeInCents} expenseInCents={analytics.expenseInCents} />
            <CategorySpendingChart items={analytics.categorySpending} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <TrendLineChart title="Evolucao mensal" data={analytics.monthlyEvolution} mode="balance" />
            <TrendLineChart title="Gastos no tempo" data={analytics.timeSeries} mode="expenses" />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <h2 className="text-base font-semibold">Lancamentos do periodo</h2>
              </div>
              {analytics.transactions.length === 0 ? <p className="text-sm text-slate-500">Nenhum lancamento no periodo.</p> : (
                <Table>
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Descricao</th>
                      <th className="px-3 py-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.transactions.slice(0, 25).map((transaction) => (
                      <tr key={transaction.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                        <td className="px-3 py-3">{formatDatePtBr(transaction.date)}</td>
                        <td className="px-3 py-3"><Badge variant={transaction.type === "INCOME" ? "success" : transaction.type === "EXPENSE" ? "danger" : "neutral"}>{transaction.type}</Badge></td>
                        <td className="px-3 py-3">{transaction.description || "-"}</td>
                        <td className={`px-3 py-3 font-medium ${transaction.type === "INCOME" ? "text-emerald-700 dark:text-emerald-300" : transaction.type === "EXPENSE" ? "text-rose-700 dark:text-rose-300" : ""}`}>{formatSignedCurrencyFromCents(transaction.amountInCents, transaction.type === "INCOME" ? "income" : transaction.type === "EXPENSE" ? "expense" : "neutral")}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
            <Card>
              <h2 className="text-base font-semibold">Escopo do MVP</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <ReportStatus label="Receitas por periodo" ready />
                <ReportStatus label="Despesas por periodo" ready />
                <ReportStatus label="Gastos por categoria" ready />
                <ReportStatus label="Evolucao" ready />
                <ReportStatus label="Parcelamentos" ready />
                <ReportStatus label="Faturas" ready />
                <ReportStatus label="Orcamentos e metas" ready />
              </div>
            </Card>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ReportStatus({ label, ready = false }: { label: string; ready?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
      <span>{label}</span>
      <Badge variant={ready ? "success" : "neutral"}>{ready ? "Disponivel" : "Fora do MVP"}</Badge>
    </div>
  );
}
