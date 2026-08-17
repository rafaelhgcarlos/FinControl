import { AlertTriangle } from "lucide-react";
import { Progress } from "../../../components/ui/Progress";
import type { CreditCard } from "../../../types/creditCard";
import { formatCurrencyFromCents } from "../../../utils/money";

export function getLimitUsage(card: Pick<CreditCard, "committedLimitInCents" | "limitInCents">) {
  const availableInCents = card.limitInCents - card.committedLimitInCents;
  const percent = card.limitInCents > 0 ? (card.committedLimitInCents / card.limitInCents) * 100 : card.committedLimitInCents > 0 ? 100 : 0;
  return { availableInCents, exceeded: availableInCents < 0, percent };
}

export function LimitUsage({ card, inverse = false }: { card: CreditCard; inverse?: boolean }) {
  const usage = getLimitUsage(card);
  return <section aria-label="Uso do limite" className={inverse ? "text-white" : "text-foreground"}>
    <Progress className={inverse ? "[&>div:last-child]:bg-white/25 [&>div:last-child>div]:bg-white" : undefined} label="Percentual do limite utilizado" max={Math.max(1, card.limitInCents)} value={card.committedLimitInCents} />
    <div className={`mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs ${inverse ? "text-white/75" : "text-muted-foreground"}`}><span>Utilizado {formatCurrencyFromCents(card.committedLimitInCents)}</span><span>{Math.round(usage.percent)}% de {formatCurrencyFromCents(card.limitInCents)}</span></div>
    <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${usage.exceeded ? inverse ? "text-amber-200" : "text-danger" : inverse ? "text-white" : "text-foreground"}`}>{usage.exceeded ? <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" /> : null}{usage.exceeded ? `Limite excedido em ${formatCurrencyFromCents(Math.abs(usage.availableInCents))}` : `Disponível ${formatCurrencyFromCents(usage.availableInCents)}`}{card.status === "ARCHIVED" ? " • Cartão arquivado" : ""}</p>
  </section>;
}
