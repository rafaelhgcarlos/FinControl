import { Skeleton } from "./ui/Skeleton";

export function LoadingState({ label = "Carregando", variant = "spinner" }: { label?: string; variant?: "spinner" | "skeleton" }) {
  if (variant === "skeleton") return <div aria-label={label} className="space-y-3" role="status"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  return (
    <div className="flex min-h-40 items-center justify-center" role="status">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
