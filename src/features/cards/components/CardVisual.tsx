import { Archive, Building2, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import type { CardInvoice, CreditCard } from "../../../types/creditCard";
import { formatCurrencyFromCents } from "../../../utils/money";

export function CardVisual({ actionsDisabled = false, card, compact = false, currentInvoice, onArchive, onDelete, onEdit, onPurchase }: {
  actionsDisabled?: boolean;
  card: CreditCard;
  compact?: boolean;
  currentInvoice?: CardInvoice;
  onArchive: (card: CreditCard) => void;
  onDelete: (card: CreditCard) => void;
  onEdit: (card: CreditCard) => void;
  onPurchase: (cardId?: string) => void;
}) {
  const available = card.limitInCents - card.committedLimitInCents;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Link className="block" to={`/app/cards/${card.id}`}>
        <div className={`relative p-5 text-white ${compact ? "min-h-44 sm:min-h-52" : "min-h-56"}`} style={{ background: `linear-gradient(135deg, ${card.color}, #0f172a)` }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_30%),linear-gradient(120deg,rgba(255,255,255,0.12),transparent_45%)]" />
          <div className="relative flex items-start justify-between">
            <BankLogo institution={card.institution} />
            <Badge className="bg-white/15 text-white ring-white/25">{card.status === "ACTIVE" ? "Ativo" : "Arquivado"}</Badge>
          </div>
          <div className={`relative ${compact ? "mt-6" : "mt-9"}`}>
            <p className="text-xs uppercase text-white/65">Crédito</p>
            <p className="mt-1 truncate text-xl font-semibold">{card.name}</p>
            <p className="mt-1 text-sm text-white/75">{card.institution || "Instituição não informada"} • final {card.lastFour ?? "----"}</p>
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-white/65">Disponível</p><p className="font-semibold">{formatCurrencyFromCents(available)}</p></div>
            <div><p className="text-white/65">Fatura atual</p><p className="font-semibold">{formatCurrencyFromCents(currentInvoice?.totalInCents ?? 0)}</p></div>
          </div>
          <div className="relative mt-4 flex items-end justify-between gap-3">
            <p className="text-xs text-white/70">Vence dia {card.dueDay}</p>
            <CardBrandMark brand={card.brand} />
          </div>
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-4">
        <Button className="px-2" disabled={actionsDisabled || card.status !== "ACTIVE"} onClick={() => onPurchase(card.id)} variant="secondary">Compra</Button>
        <Button className="px-2" disabled={actionsDisabled} onClick={() => onEdit(card)} variant="ghost"><Pencil className="h-4 w-4" aria-hidden="true" />Editar</Button>
        <Button className="px-2" disabled={actionsDisabled || card.status === "ARCHIVED"} onClick={() => onArchive(card)} variant="ghost"><Archive className="h-4 w-4" aria-hidden="true" />Arquivar</Button>
        <Button className="px-2" disabled={actionsDisabled} onClick={() => onDelete(card)} variant="danger"><Trash2 className="h-4 w-4" aria-hidden="true" />Apagar</Button>
      </div>
    </div>
  );
}

function BankLogo({ institution }: { institution?: string }) {
  const bank = getBankLogo(institution);
  return (
    <div className={`flex h-11 min-w-11 items-center justify-center rounded-md px-2 font-semibold shadow-sm ring-1 ring-white/25 ${bank?.className ?? "bg-white/15 text-white"}`}>
      {bank ? <span aria-label={`Logo ${bank.name}`} className="text-sm">{bank.mark}</span> : <Building2 className="h-6 w-6 text-white" aria-hidden="true" />}
    </div>
  );
}

function CardBrandMark({ brand = "OTHER" }: { brand?: CreditCard["brand"] }) {
  if (brand === "MASTERCARD") {
    return <div aria-label="Mastercard" className="relative h-8 w-12"><span className="absolute left-2 top-1 h-6 w-6 rounded-full bg-red-500/95" /><span className="absolute right-2 top-1 h-6 w-6 rounded-full bg-amber-400/95 mix-blend-screen" /></div>;
  }
  const marks = {
    VISA: { label: "Visa", text: "VISA", className: "bg-white text-blue-700 italic tracking-wide" },
    ELO: { label: "Elo", text: "elo", className: "bg-white text-slate-950" },
    AMEX: { label: "American Express", text: "AMEX", className: "bg-sky-500 text-white" },
    HIPERCARD: { label: "Hipercard", text: "Hiper", className: "bg-red-600 text-white" },
    OTHER: { label: "Bandeira", text: "CARD", className: "bg-white/15 text-white ring-1 ring-white/25" },
  } as const;
  const mark = marks[brand ?? "OTHER"];
  return <span aria-label={mark.label} className={`rounded px-2 py-1 text-xs font-bold ${mark.className}`}>{mark.text}</span>;
}

function getBankLogo(institution?: string) {
  const normalized = institution?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";
  if (normalized.includes("nubank")) return { name: "Nubank", mark: "Nu", className: "bg-violet-700 text-white" };
  if (normalized.includes("itau")) return { name: "Itaú", mark: "Itaú", className: "bg-orange-500 text-blue-900" };
  if (normalized.includes("bradesco")) return { name: "Bradesco", mark: "B", className: "bg-red-600 text-white" };
  if (normalized.includes("santander")) return { name: "Santander", mark: "S", className: "bg-red-600 text-white" };
  if (normalized.includes("inter")) return { name: "Inter", mark: "Inter", className: "bg-orange-500 text-white" };
  if (normalized.includes("c6")) return { name: "C6 Bank", mark: "C6", className: "bg-zinc-950 text-white" };
  if (normalized.includes("caixa")) return { name: "Caixa", mark: "CAIXA", className: "bg-blue-700 text-white" };
  if (normalized.includes("brasil")) return { name: "Banco do Brasil", mark: "BB", className: "bg-yellow-400 text-blue-900" };
  if (normalized.includes("xp")) return { name: "XP", mark: "XP", className: "bg-black text-yellow-400" };
  return null;
}
