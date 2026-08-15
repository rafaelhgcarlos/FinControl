import { describe, expect, it } from "vitest";
import { assertIntegerCents, formatCurrencyFromCents, formatSignedCurrencyFromCents, sumCents } from "./money";

describe("money", () => {
  it("formata centavos em BRL pt-BR", () => {
    expect(formatCurrencyFromCents(123_456)).toBe("R$ 1.234,56");
  });

  it("soma somente inteiros em centavos", () => {
    expect(sumCents([100, 250, 650])).toBe(1_000);
    expect(() => assertIntegerCents(10.5)).toThrow("Valores monetarios devem ser inteiros em centavos.");
  });

  it("formata valores com sinal conforme tipo de movimentacao", () => {
    expect(formatSignedCurrencyFromCents(123_456, "income")).toBe(`+${formatCurrencyFromCents(123_456)}`);
    expect(formatSignedCurrencyFromCents(123_456, "expense")).toBe(`-${formatCurrencyFromCents(123_456)}`);
  });
});
