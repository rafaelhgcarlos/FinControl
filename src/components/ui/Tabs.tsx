import { cn } from "../../utils/cn";

export type TabItem<T extends string> = { label: string; value: T };

export function Tabs<T extends string>({ active, ariaLabel, items, onChange }: { active: T; ariaLabel: string; items: Array<TabItem<T>>; onChange: (value: T) => void }) {
  return <div aria-label={ariaLabel} className="grid grid-cols-2 gap-2 border-b border-border pb-3 sm:flex sm:overflow-x-auto" role="tablist">{items.map((item) => <button aria-selected={active === item.value} className={cn("min-h-11 rounded-control px-3 py-2 text-sm font-medium transition-colors", active === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground")} key={item.value} onClick={() => onChange(item.value)} role="tab" type="button">{item.label}</button>)}</div>;
}
