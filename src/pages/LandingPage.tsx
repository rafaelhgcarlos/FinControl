import { ArrowRight, CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">F</span>FinControl</Link>
        <div className="flex items-center gap-2"><Link to="/login" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Entrar</Link><Link to="/register"><Button>Começar agora <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></Link></div>
      </nav>
      <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
          <div className="max-w-2xl self-center"><p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Sua vida financeira, no controle</p><h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Decisões mais claras começam com um bom panorama.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">Organize contas, cartões, metas e gastos em um só lugar, com privacidade e uma experiência feita para a rotina brasileira.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/register"><Button className="min-h-12 px-5">Criar minha conta <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></Link><Link to="/login"><Button variant="secondary" className="min-h-12 px-5">Já tenho uma conta</Button></Link></div></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:content-center"><Feature icon={ShieldCheck} title="Privacidade por padrão" text="Seus dados ficam vinculados à sua conta e protegidos pelas regras do Firebase." /><Feature icon={Smartphone} title="Feito para a rotina" text="Acompanhe suas finanças no celular, tablet ou computador." /><Feature icon={CheckCircle2} title="Valores confiáveis" text="Operações financeiras são tratadas em centavos inteiros, sem arredondamentos inesperados." /></div>
        </div>
      </section>
      <footer className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">FinControl · Controle financeiro pessoal em BRL</footer>
    </main>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{text}</p></div></div>;
}
