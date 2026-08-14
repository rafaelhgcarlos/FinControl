type ErrorStateProps = {
  title?: string;
  message: string;
};

export function ErrorState({ message, title = "Não foi possível carregar os dados" }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100" role="alert">
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
