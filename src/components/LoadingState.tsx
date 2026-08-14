export function LoadingState({ label = "Carregando" }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center" role="status">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
