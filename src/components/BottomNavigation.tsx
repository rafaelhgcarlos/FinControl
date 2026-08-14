import { Gauge, Landmark, Plus, ReceiptText, Tags } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { label: "Inicio", to: "/app", icon: Gauge },
  { label: "Historico", to: "/app/transactions", icon: ReceiptText },
  { label: "Lancar", to: "/app/transactions?new=1", icon: Plus },
  { label: "Contas", to: "/app/accounts", icon: Landmark },
  { label: "Categorias", to: "/app/categories", icon: Tags },
];

export function BottomNavigation() {
  return (
    <nav aria-label="Navegacao inferior" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
      {items.map(({ icon: Icon, label, to }) => (
        <NavLink
          key={label}
          to={to}
          end={to === "/app"}
          className={({ isActive }) =>
            `flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-1 text-[11px] font-medium ${
              isActive ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"
            }`
          }
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
