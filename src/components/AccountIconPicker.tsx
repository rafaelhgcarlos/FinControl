import { Banknote, BriefcaseBusiness, Building2, CircleDollarSign, Landmark, PiggyBank, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "../utils/cn";

export const accountIconOptions: Array<{ name: string; label: string; Icon: LucideIcon }> = [
  { name: "Landmark", label: "Banco", Icon: Landmark },
  { name: "Wallet", label: "Carteira", Icon: Wallet },
  { name: "PiggyBank", label: "Poupança", Icon: PiggyBank },
  { name: "Smartphone", label: "Conta digital", Icon: Smartphone },
  { name: "Banknote", label: "Dinheiro", Icon: Banknote },
  { name: "CircleDollarSign", label: "Investimentos", Icon: CircleDollarSign },
  { name: "Building2", label: "Empresa", Icon: Building2 },
  { name: "BriefcaseBusiness", label: "Trabalho", Icon: BriefcaseBusiness },
];

export function AccountIconPicker({ color, disabled = false, id, onChange, value }: { color?: string; disabled?: boolean; id: string; onChange: (icon: string) => void; value: string }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-semibold text-foreground">Ícone</legend>
      <p className="mt-1 text-xs text-muted-foreground" id={`${id}-hint`}>Escolha como a conta será identificada visualmente.</p>
      <div aria-describedby={`${id}-hint`} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
        {accountIconOptions.map(({ Icon, label, name }) => {
          const checked = value === name;
          return (
            <label className={cn("flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-control border px-1.5 py-2 text-center transition focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2", checked ? "border-primary bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground hover:bg-surface-subtle", disabled && "cursor-not-allowed opacity-60")} key={name} title={label}>
              <input checked={checked} className="sr-only" name={`${id}-choice`} onChange={() => onChange(name)} type="radio" value={name} />
              <Icon aria-hidden="true" className="h-5 w-5" style={checked && color ? { color } : undefined} />
              <span className="w-full whitespace-normal break-words text-xs font-medium leading-tight">{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AccountIcon({ className, color, name }: { className?: string; color?: string; name: string }) {
  const Icon = accountIconOptions.find((option) => option.name === name)?.Icon ?? Landmark;
  return <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-surface-subtle", className)} style={color ? { color } : undefined}><Icon className="h-1/2 w-1/2" /></span>;
}
