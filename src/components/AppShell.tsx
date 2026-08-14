import { Menu, WalletCards } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../services/authService";
import { BottomNavigation } from "./BottomNavigation";
import { Sidebar } from "./Sidebar";
import { Button } from "./Button";

export function AppShell() {
  const { profile } = useAuth();
  const location = useLocation();
  const title = location.pathname === "/app" ? "Visão geral" : "FinControl";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-8">
          <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-slate-50/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Menu className="h-5 w-5 text-slate-500 lg:hidden" aria-hidden="true" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">FinControl</p>
                <h1 className="text-lg font-semibold">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{profile?.displayName || "Minha conta"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
              </div>
              <Button aria-label="Sair da conta" onClick={() => void logout()} variant="ghost" className="px-2">
                <WalletCards className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
}
