import { Menu, WalletCards } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../services/authService";
import { BottomNavigation } from "./BottomNavigation";
import { Button } from "./Button";
import { Sidebar } from "./Sidebar";

const titles: Record<string, string> = {
  "/app": "Visao geral",
  "/app/transactions": "Historico",
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
  const location = useLocation();
  const title = titles[location.pathname] ?? "FinControl";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Menu className="h-5 w-5 shrink-0 text-slate-500 lg:hidden" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-400">FinControl</p>
                  <h1 className="truncate text-lg font-semibold">{title}</h1>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium">{profile?.displayName || "Minha conta"}</p>
                  <p className="max-w-56 truncate text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
                </div>
                <Button aria-label="Sair da conta" onClick={() => void logout()} variant="ghost" className="px-2">
                  <WalletCards className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </header>
          <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
}
