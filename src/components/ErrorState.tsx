type ErrorStateProps = {
  title?: string;
  message: string;
};

export function ErrorState({ message, title = "Não foi possível carregar os dados" }: ErrorStateProps) {
  return (
    <div className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
