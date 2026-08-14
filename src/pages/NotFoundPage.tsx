import { Link } from "react-router-dom";
import { buttonClassName } from "../components/buttonStyles";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 dark:bg-slate-950">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          O endereço informado não existe nesta versão do FinControl.
        </p>
        <Link className={buttonClassName("primary", "mt-6")} to="/">
          Voltar ao painel
        </Link>
      </div>
    </main>
  );
}
