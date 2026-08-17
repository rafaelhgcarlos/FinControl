import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-control bg-border/70", className)} {...props} />;
}

export function CardSkeleton() {
  return <div aria-label="Carregando conteúdo" className="rounded-surface border border-border bg-surface p-4 shadow-surface" role="status"><Skeleton className="h-4 w-2/5" /><Skeleton className="mt-4 h-8 w-3/4" /><Skeleton className="mt-3 h-3 w-full" /></div>;
}

export function ListSkeleton({ count = 4, label = "Carregando lista" }: { count?: number; label?: string }) {
  return <div aria-label={label} className="space-y-2" role="status">{Array.from({ length: count }, (_, index) => <div className="flex items-center gap-3 rounded-surface border border-border bg-surface p-3" key={index}><Skeleton className="h-10 w-10 shrink-0 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-2/5" /><Skeleton className="mt-2 h-3 w-3/5" /></div><Skeleton className="h-5 w-20" /></div>)}</div>;
}

export function TableSkeleton({ columns = 4, label = "Carregando tabela", rows = 5 }: { columns?: number; label?: string; rows?: number }) {
  return <div aria-label={label} className="overflow-hidden rounded-surface border border-border bg-surface p-4" role="status"><div className="grid gap-4 border-b border-border pb-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, index) => <Skeleton className="h-3" key={index} />)}</div>{Array.from({ length: rows }, (_, row) => <div className="grid gap-4 border-b border-border/60 py-4 last:border-0" key={row} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, column) => <Skeleton className="h-4" key={column} />)}</div>)}</div>;
}

export function DashboardSkeleton() {
  return <div aria-label="Carregando dashboard" className="space-y-5" role="status"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <CardSkeleton key={index} />)}</div><Skeleton className="h-40 w-full rounded-surface" /><div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-72 rounded-surface" /><Skeleton className="h-72 rounded-surface" /></div></div>;
}

export function CardsSkeleton() {
  return <div aria-label="Carregando cartões" className="space-y-5" role="status"><div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <CardSkeleton key={index} />)}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton className="h-72 rounded-surface" key={index} />)}</div></div>;
}
