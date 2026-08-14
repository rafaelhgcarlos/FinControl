import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">F</span>
          FinControl
        </Link>
        {children}
      </div>
    </main>
  );
}
