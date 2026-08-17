import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { groupCalendarEventsByDate, listCalendarEvents, saoPauloMonthRange, type CalendarEvent } from "../services/calendarService";
import { toSaoPauloDateKey } from "../services/recurringTransactionsService";
import { formatCurrencyFromCents } from "../utils/money";

const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

export function CalendarPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState(() => toSaoPauloDateKey(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => saoPauloMonthRange(month.getFullYear(), month.getMonth()), [month]);
  const groups = useMemo(() => groupCalendarEventsByDate(events), [events]);
  const selectedEvents = groups[selectedKey] ?? [];

  const load = useCallback(async () => {
    if (!user) return; setLoading(true); setError(null);
    try { setEvents(await listCalendarEvents(user.uid, range.startDate, range.endDate)); }
    catch { setError("Nao foi possivel carregar os eventos do periodo."); }
    finally { setLoading(false); }
  }, [range.endDate, range.startDate, user]);
  useEffect(() => { void load(); }, [load]);

  function navigate(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next); setSelectedKey(toSaoPauloDateKey(new Date(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01T12:00:00-03:00`)));
  }
  const days = buildMonthDays(month);

  return <>
    <PageHeader title="Calendario financeiro" description="Eventos realizados e previstos, consultados somente para o mes exibido." action={<div className="flex items-center gap-2"><Button aria-label="Mes anterior" variant="secondary" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button><strong className="min-w-32 text-center capitalize">{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong><Button aria-label="Proximo mes" variant="secondary" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button></div>} />
    {error ? <ErrorState message={error} /> : loading ? <Card><LoadingState label="Carregando calendario" /></Card> : <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <Card className="overflow-x-auto"><div className="min-w-[560px]"><div className="grid grid-cols-7 gap-1">{weekdayLabels.map((label) => <div key={label} className="py-2 text-center text-xs font-semibold text-slate-500">{label}</div>)}{days.map((day, index) => {
        const dateKey = day ? toSaoPauloDateKey(day) : ""; const dayEvents = day ? groups[dateKey] ?? [] : [];
        return day ? <button key={dateKey} className={`min-h-20 rounded-md border p-2 text-left transition ${selectedKey === dateKey ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"}`} onClick={() => setSelectedKey(dateKey)}><span className="text-sm font-medium">{day.getDate()}</span>{dayEvents.length ? <div className="mt-2 flex flex-wrap gap-1">{dayEvents.slice(0, 3).map((event) => <span key={event.id} className={`h-2 w-2 rounded-full ${event.direction === "INCOME" ? "bg-emerald-500" : "bg-rose-500"}`} />)}{dayEvents.length > 3 ? <span className="text-[10px]">+{dayEvents.length - 3}</span> : null}</div> : null}</button> : <div key={`empty-${index}`} />;
      })}</div></div></Card>
      <Card><h2 className="font-semibold">Eventos de {selectedKey.split("-").reverse().join("/")}</h2>{selectedEvents.length === 0 ? <div className="mt-5"><EmptyState title="Nenhum evento" description="Nao ha compromissos nesta data." icon={<CalendarDays className="h-6 w-6" />} /></div> : <div className="mt-4 grid gap-3">{selectedEvents.map((event) => <div key={event.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{event.title}</p><p className={`mt-1 text-sm ${event.direction === "INCOME" ? "text-emerald-700" : "text-rose-700"}`}>{event.direction === "INCOME" ? "+" : "-"}{formatCurrencyFromCents(event.amountInCents)}</p></div><Badge variant={event.kind === "TRANSACTION" ? "success" : event.status === "OVERDUE" ? "danger" : "neutral"}>{kindLabel(event.kind)}</Badge></div></div>)}</div>}</Card>
    </div>}
  </>;
}

function buildMonthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12); const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); const leading = (first.getDay() + 6) % 7;
  return [...Array.from({ length: leading }, () => null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1, 12))];
}
function kindLabel(kind: CalendarEvent["kind"]) { return kind === "TRANSACTION" ? "Realizado" : kind === "INVOICE" ? "Fatura" : kind === "INSTALLMENT" ? "Parcela" : "Recorrencia"; }
