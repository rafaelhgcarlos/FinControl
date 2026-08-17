import { Gauge, Landmark, Plus, ReceiptText, Tags } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { label: "Inicio", to: "/app", icon: Gauge },
  { label: "Historico", to: "/app/transactions", icon: ReceiptText },
  { label: "Contas", to: "/app/accounts", icon: Landmark },
  { label: "Categorias", to: "/app/categories", icon: Tags },
];

export function BottomNavigation({ onNewEntry }: { onNewEntry: () => void }) {
  return (
    <nav aria-label="Navegacao inferior" className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200/80 bg-white/95 px-2 pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#10151c]/95 lg:hidden">
      {items.slice(0, 2).map(({ icon: Icon, label, to }) => (
        <NavLink
          key={label}
          to={to}
          end={to === "/app"}
          className={({ isActive }) =>
            `relative flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-semibold transition-colors ${isActive ? "text-slate-950 dark:text-white" : "text-slate-400 dark:text-slate-500"}`
          }
        >
          <span className="flex h-6 items-center justify-center">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
      <button className="relative -mt-5 flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-semibold text-emerald-700 transition-colors dark:text-emerald-300" onClick={onNewEntry} type="button">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-4 ring-white dark:ring-[#10151c]"><Plus aria-hidden="true" className="h-5 w-5" /></span>
        <span className="truncate">Lancar</span>
      </button>
      {items.slice(2).map(({ icon: Icon, label, to }) => (
        <NavLink key={label} to={to} className={({ isActive }) => `relative flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-semibold transition-colors ${isActive ? "text-slate-950 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
          <span className="flex h-6 items-center justify-center"><Icon aria-hidden="true" className="h-5 w-5" /></span><span className="truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
