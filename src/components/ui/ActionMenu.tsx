import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { IconButton } from "./IconButton";

export type ActionMenuItem = { danger?: boolean; disabled?: boolean; icon?: ReactNode; label: string; onSelect: () => void };

export function ActionMenu({ disabled = false, items, label = "Mais ações" }: { disabled?: boolean; items: ActionMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    if (open) itemRefs.current.find((item) => item && !item.disabled)?.focus();
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function focusItem(offset: number) {
    const enabledItems = itemRefs.current.filter((item): item is HTMLButtonElement => Boolean(item && !item.disabled));
    const currentIndex = enabledItems.indexOf(document.activeElement as HTMLButtonElement);
    enabledItems[(currentIndex + offset + enabledItems.length) % enabledItems.length]?.focus();
  }

  return <div className="relative" onKeyDown={(event) => {
    if (event.key === "Escape") {
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>("button[aria-haspopup='menu']")?.focus();
    } else if (open && event.key === "ArrowDown") {
      event.preventDefault(); focusItem(1);
    } else if (open && event.key === "ArrowUp") {
      event.preventDefault(); focusItem(-1);
    } else if (open && event.key === "Home") {
      event.preventDefault(); itemRefs.current.find((item) => item && !item.disabled)?.focus();
    } else if (open && event.key === "End") {
      event.preventDefault(); [...itemRefs.current].reverse().find((item) => item && !item.disabled)?.focus();
    }
  }} ref={rootRef}>
    <IconButton aria-expanded={open} aria-haspopup="menu" aria-label={label} disabled={disabled} onClick={() => setOpen((value) => !value)} variant="secondary"><MoreHorizontal aria-hidden="true" className="h-5 w-5" /></IconButton>
    {open ? <div aria-label={label} className="absolute bottom-full right-0 z-20 mb-2 min-w-48 rounded-surface border border-border bg-surface p-1 shadow-overlay" role="menu">{items.map((item, index) => <button className={cn("flex min-h-10 w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm font-medium hover:bg-surface-subtle focus-visible:ring-inset", item.danger ? "text-danger" : "text-foreground")} disabled={item.disabled} key={item.label} onClick={() => { item.onSelect(); setOpen(false); }} ref={(element) => { itemRefs.current[index] = element; }} role="menuitem" type="button">{item.icon}{item.label}</button>)}</div> : null}
  </div>;
}
