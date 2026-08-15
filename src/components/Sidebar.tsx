import { BarChart3, CalendarDays, CreditCard, Gauge, Landmark, PiggyBank, ReceiptText, Repeat, Settings, Tags, Target, WalletCards } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

const groups = [
  { label: "Visao geral", items: [
    { label: "Inicio", to: "/app", icon: Gauge },
    { label: "Historico", to: "/app/transactions", icon: ReceiptText },
    { label: "Contas", to: "/app/accounts", icon: Landmark },
    { label: "Cartoes", to: "/app/cards", icon: CreditCard },
  ] },
  { label: "Planejamento", items: [
    { label: "Recorrencias", to: "/app/recurring", icon: Repeat },
    { label: "Categorias", to: "/app/categories", icon: Tags },
    { label: "Orcamentos", to: "/app/budgets", icon: PiggyBank },
    { label: "Metas", to: "/app/goals", icon: Target },
    { label: "Calendario", to: "/app/calendar", icon: CalendarDays },
  ] },
  { label: "Analise", items: [
    { label: "Relatorios", to: "/app/reports", icon: BarChart3 },
    { label: "Configuracoes", to: "/app/settings", icon: Settings },
  ] },
];

export function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  return (
    <aside className={`${mobile ? "flex" : "sticky top-0 hidden lg:flex"} h-screen w-full flex-col border-r border-slate-200/80 bg-white px-4 py-5 dark:border-slate-800/80 dark:bg-[#10151c] lg:w-[17rem] lg:shrink-0`}>
      <Link to="/app" onClick={onNavigate} className="mb-7 flex items-center gap-3 px-2 text-lg font-bold">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
          <WalletCards className="h-5 w-5" aria-hidden="true" />
        </span>
        <span><span className="text-slate-950 dark:text-white">Fin</span><span className="text-emerald-600 dark:text-emerald-400">Control</span></span>
      </Link>
      <nav aria-label="Navegacao principal" className="scrollbar-none min-h-0 flex-1 space-y-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ icon: Icon, label, to }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/app"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-950 text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"
                    }`
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-4 rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-900/80">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Organize hoje</p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-500">Decisoes melhores com seus numeros em ordem.</p>
      </div>
    </aside>
  );
}
