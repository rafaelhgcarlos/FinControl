import { Ellipsis, Plus } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Modal } from "./Modal";
import { isNavigationPathActive, mobilePrimaryItems, mobileSecondaryGroups } from "./navigation";

export function BottomNavigation({ onNewEntry }: { onNewEntry: () => void }) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreIsActive = mobileSecondaryGroups.some((group) => group.items.some((item) => isNavigationPathActive(location.pathname, item.to)));
  const [home, transactions, cards] = mobilePrimaryItems;

  function primaryItem({ icon: Icon, label, to }: (typeof mobilePrimaryItems)[number]) {
    return (
      <NavLink
        aria-label={label}
        className={({ isActive }) =>
          `relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold transition-colors ${isActive ? "text-slate-950 dark:text-white" : "text-slate-400 dark:text-slate-500"}`
        }
        end={to === "/app"}
        key={to}
        to={to}
      >
        <Icon aria-hidden="true" className="h-5 w-5" />
        <span className="truncate">{label}</span>
      </NavLink>
    );
  }

  return (
    <>
      <nav aria-label="Navegação inferior" className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200/80 bg-white/95 px-2 pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#10151c]/95 lg:hidden">
        {primaryItem(home)}
        {primaryItem(transactions)}
        <button aria-label="Lançar" className="relative -mt-5 flex min-h-12 min-w-0 flex-col items-center gap-1 rounded-lg px-1 text-[10px] font-semibold text-emerald-700 transition-colors dark:text-emerald-300" onClick={onNewEntry} type="button">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-4 ring-white dark:ring-[#10151c]"><Plus aria-hidden="true" className="h-5 w-5" /></span>
          <span className="truncate">Lançar</span>
        </button>
        {primaryItem(cards)}
        <button
          aria-current={moreIsActive ? "page" : undefined}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          aria-label="Mais"
          className={`relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold transition-colors ${moreIsActive ? "text-slate-950 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}
          onClick={() => setMoreOpen(true)}
          type="button"
        >
          <Ellipsis aria-hidden="true" className="h-5 w-5" />
          <span className="truncate">Mais</span>
        </button>
      </nav>

      <Modal description="Acesse os demais módulos do seu espaço financeiro." isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Mais opções">
        <nav aria-label="Módulos secundários" className="space-y-5">
          {mobileSecondaryGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{group.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map(({ icon: Icon, label, to }) => {
                  const active = isNavigationPathActive(location.pathname, to);
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${active ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                      key={to}
                      onClick={() => setMoreOpen(false)}
                      to={to}
                    >
                      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </Modal>
    </>
  );
}
