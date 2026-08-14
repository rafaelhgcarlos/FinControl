export const businessTimeZone = "America/Sao_Paulo";

export function formatDatePtBr(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: businessTimeZone,
  }).format(date);
}
