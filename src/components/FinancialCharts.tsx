import { ChartContainer } from "./ChartContainer";
import { EmptyState } from "./EmptyState";
import type { CategorySpending, ChartPoint } from "../services/analyticsService";
import { formatCurrencyFromCents } from "../utils/money";

type IncomeExpenseChartProps = {
  incomeInCents: number;
  expenseInCents: number;
};

export function IncomeExpenseChart({ expenseInCents, incomeInCents }: IncomeExpenseChartProps) {
  const max = Math.max(incomeInCents, expenseInCents, 1);
  const incomeHeight = Math.max(4, Math.round((incomeInCents / max) * 160));
  const expenseHeight = Math.max(4, Math.round((expenseInCents / max) * 160));

  return (
    <ChartContainer>
      <div>
        <h3 className="text-sm font-semibold">Fluxo do periodo</h3>
        <p className="mt-1 text-xs text-slate-500">Receitas e despesas lado a lado</p>
      </div>
      <div className="mt-5 flex h-48 items-end justify-center gap-6 sm:gap-10">
        <Bar label="Receitas" value={incomeInCents} height={incomeHeight} className="bg-emerald-500" />
        <Bar label="Despesas" value={expenseInCents} height={expenseHeight} className="bg-rose-500" />
      </div>
    </ChartContainer>
  );
}

export function CategorySpendingChart({ items }: { items: CategorySpending[] }) {
  const max = Math.max(...items.map((item) => item.amountInCents), 1);
  return (
    <ChartContainer>
      <div>
        <h3 className="text-sm font-semibold">Gastos por categoria</h3>
        <p className="mt-1 text-xs text-slate-500">Onde seu dinheiro teve maior impacto</p>
      </div>
      {items.length === 0 ? <EmptyState title="Sem despesas no periodo" description="As categorias aparecem quando houver despesas." /> : (
        <div className="mt-5 space-y-3">
          {items.slice(0, 8).map((item) => (
            <div key={item.categoryId}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate">{item.name}</span>
                <span className="font-medium">{formatCurrencyFromCents(item.amountInCents)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-1.5 rounded-full" style={{ width: `${Math.max(4, (item.amountInCents / max) * 100)}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartContainer>
  );
}

export function TrendLineChart({ title, data, mode }: { title: string; data: ChartPoint[]; mode: "balance" | "expenses" }) {
  const values = data.map((point) => mode === "balance" ? point.balanceInCents : point.expenseInCents);
  const max = Math.max(...values.map((value) => Math.abs(value)), 1);
  const points = values.map((value, index) => {
    const x = data.length <= 1 ? 10 : 10 + (index / (data.length - 1)) * 280;
    const y = 90 - (value / max) * 70;
    return `${x},${Math.min(160, Math.max(10, y))}`;
  }).join(" ");

  return (
    <ChartContainer>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">Comportamento ao longo do periodo</p>
      </div>
      {data.length === 0 ? <EmptyState title="Sem dados no periodo" description="Registre lancamentos para ver a evolucao." /> : (
        <div className="mt-5">
          <svg className="h-44 w-full overflow-visible" viewBox="0 0 300 170" role="img" aria-label={title}>
            <line x1="10" x2="290" y1="90" y2="90" className="stroke-slate-200 dark:stroke-slate-800" />
            <polyline fill="none" points={points} stroke={mode === "balance" ? "#10b981" : "#f43f5e"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          </svg>
          <div className="mt-2 flex justify-between gap-2 text-xs text-slate-500">
            {data.slice(0, 6).map((point) => <span key={point.label} className="truncate">{point.label}</span>)}
          </div>
        </div>
      )}
    </ChartContainer>
  );
}

function Bar({ className, height, label, value }: { className: string; height: number; label: string; value: number }) {
  return (
    <div className="flex w-24 flex-col items-center justify-end gap-2 sm:w-28">
      <span className="text-xs font-medium">{formatCurrencyFromCents(value)}</span>
      <div className={`w-12 rounded-t-lg sm:w-16 ${className}`} style={{ height }} />
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
