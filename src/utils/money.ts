const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function formatCurrencyFromCents(valueInCents: number) {
  assertIntegerCents(valueInCents);
  return currencyFormatter.format(valueInCents / 100);
}

export function formatSignedCurrencyFromCents(valueInCents: number, sign: "income" | "expense" | "neutral") {
  assertIntegerCents(valueInCents);
  if (sign === "neutral") return formatCurrencyFromCents(valueInCents);
  return `${sign === "income" ? "+" : "-"}${formatCurrencyFromCents(Math.abs(valueInCents))}`;
}

export function parseCurrencyToCents(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

export function formatCurrencyInputFromCents(valueInCents: number) {
  return formatCurrencyFromCents(valueInCents);
}

export function sumCents(values: number[]) {
  return values.reduce((total, value) => {
    assertIntegerCents(value);
    return total + value;
  }, 0);
}

export function applyTransactionToBalance(balanceInCents: number, amountInCents: number, type: "income" | "expense") {
  assertIntegerCents(balanceInCents);
  assertIntegerCents(amountInCents);
  return type === "income" ? balanceInCents + amountInCents : balanceInCents - amountInCents;
}

export function assertIntegerCents(value: number) {
  if (!Number.isInteger(value)) {
    throw new Error("Valores monetarios devem ser inteiros em centavos.");
  }
}
