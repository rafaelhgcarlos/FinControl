import { cn } from "../../utils/cn";

export function Progress({ className, label, max = 100, showValue = false, value }: { className?: string; label: string; max?: number; showValue?: boolean; value: number }) {
  const normalized = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return <div className={className}>{showValue ? <div className="mb-1.5 flex justify-between gap-3 text-xs"><span>{label}</span><span>{Math.round(normalized)}%</span></div> : null}<div aria-label={label} aria-valuemax={max} aria-valuemin={0} aria-valuenow={Math.min(max, Math.max(0, value))} className="h-2 overflow-hidden rounded-full bg-border/70" role="progressbar"><div className={cn("h-full rounded-full bg-primary transition-[width]", normalized >= 100 && "bg-warning")} style={{ width: `${normalized}%` }} /></div></div>;
}
