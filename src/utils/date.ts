export const businessTimeZone = "America/Sao_Paulo";

export function formatDatePtBr(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: businessTimeZone,
  }).format(date);
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = startOfDay(date);
  start.setDate(start.getDate() - diff);
  return start;
}

export function endOfWeek(date: Date) {
  const end = endOfDay(startOfWeek(date));
  end.setDate(end.getDate() + 6);
  return end;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

export function endOfYear(date: Date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

export function monthShortLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: businessTimeZone,
  }).format(date);
}
