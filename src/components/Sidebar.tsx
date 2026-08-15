import { BarChart3, CalendarDays, CreditCard, Gauge, Landmark, PiggyBank, ReceiptText, Repeat, Settings, Tags, Target } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

const items = [
  { label: "Inicio", to: "/app", icon: Gauge },
  { label: "Historico", to: "/app/transactions", icon: ReceiptText },
  { label: "Recorrencias", to: "/app/recurring", icon: Repeat },
  { label: "Contas", to: "/app/accounts", icon: Landmark },
  { label: "Categorias", to: "/app/categories", icon: Tags },
  { label: "Cartoes", to: "/app/cards", icon: CreditCard },
  { label: "Orcamentos", to: "/app/budgets", icon: PiggyBank },
  { label: "Metas", to: "/app/goals", icon: Target },
  { label: "Calendario", to: "/app/calendar", icon: CalendarDays },
  { label: "Relatorios", to: "/app/reports", icon: BarChart3 },
  { label: "Configuracoes", to: "/app/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950 lg:block">
      <Link to="/app" className="mb-8 flex items-center gap-2 px-3 text-lg font-bold">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">F</span>
        FinControl
      </Link>
      <nav aria-label="Navegacao principal" className="space-y-1">
        {items.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/app"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
