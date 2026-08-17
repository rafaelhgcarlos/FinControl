import { CheckCircle2, LogOut, Menu, RefreshCw, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../services/authService";
import { useSyncStatus } from "../contexts/SyncContext";
import { BottomNavigation } from "./BottomNavigation";
import { Button } from "./Button";
import { Sidebar } from "./Sidebar";

const titles: Record<string, string> = {
  "/app": "Visao geral",
  "/app/transactions": "Historico",
  "/app/recurring": "Recorrencias",
  "/app/accounts": "Contas",
  "/app/categories": "Categorias",
  "/app/cards": "Cartoes",
  "/app/budgets": "Orcamentos",
  "/app/goals": "Metas",
  "/app/calendar": "Calendario",
  "/app/reports": "Relatorios",
  "/app/settings": "Configuracoes",
};

export function AppShell() {
  const { profile } = useAuth();
  const sync = useSyncStatus();
  const location = useLocation();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const title = titles[location.pathname] ?? "FinControl";
  const syncLabel = sync.status === "offline" ? "Offline" : sync.status === "syncing" ? "Sincronizando" : "Sincronizado";
  const initials = (profile?.displayName || profile?.email || "FC")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    setNavigationOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-950 dark:bg-[#0b0f14] dark:text-slate-50">
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0b0f14]/90">
            <div className="flex min-h-[4.25rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:px-10">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  aria-label="Abrir navegacao"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  onClick={() => setNavigationOpen(true)}
                  title="Abrir navegacao"
                  type="button"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="min-w-0">
                  <p className="hidden text-xs font-medium text-slate-500 sm:block dark:text-slate-400">Seu espaco financeiro</p>
                  <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <span aria-label={syncLabel} aria-live="polite" className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sync.status === "offline" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`} role="status">
                  {sync.status === "offline" ? <WifiOff className="h-3.5 w-3.5" /> : sync.status === "syncing" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{syncLabel}</span>
                </span>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium">{profile?.displayName || "Minha conta"}</p>
                  <p className="max-w-48 truncate text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-emerald-500 dark:text-emerald-950">
                  {initials || "FC"}
                </span>
                <Button aria-label="Sair da conta" onClick={() => void logout()} variant="ghost" className="h-10 w-10 px-0" title="Sair da conta">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </header>
          <div className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {navigationOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Fechar navegacao" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setNavigationOpen(false)} type="button" />
          <div className="relative h-full w-[min(88vw,20rem)] shadow-2xl">
            <button
              aria-label="Fechar navegacao"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setNavigationOpen(false)}
              title="Fechar navegacao"
              type="button"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <Sidebar mobile onNavigate={() => setNavigationOpen(false)} />
          </div>
        </div>
      ) : null}
      <BottomNavigation />
    </div>
  );
}
