import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CardInstallment, CardInvoice, CardPurchase, CreditCard } from "../../../types/creditCard";
import { defaultInvoiceView } from "../cardViewUtils";
import { InvoiceView } from "./InvoiceView";

const now = new Date("2026-08-17T12:00:00");
const card: CreditCard = { id: "card-1", userId: "user-1", createdAt: now, updatedAt: now, name: "Principal", limitInCents: 500000, committedLimitInCents: 100000, closingDay: 10, dueDay: 20, color: "#2563eb", status: "ACTIVE" };

function invoice(status: CardInvoice["status"] = "OPEN", paidInCents = 0): CardInvoice {
  return { id: "invoice-1", userId: "user-1", createdAt: now, updatedAt: now, cardId: card.id, cycleKey: "2026-08", totalInCents: 120000, paidInCents, closingDate: new Date("2026-08-10T12:00:00"), dueDate: new Date("2026-08-20T12:00:00"), status };
}

function purchase(index: number): CardPurchase {
  return { id: `purchase-${index}`, userId: "user-1", createdAt: now, updatedAt: now, cardId: card.id, description: `Compra ${index}`, amountInCents: 1000 + index, purchaseDate: new Date(2026, 7, (index % 15) + 1, 12), installmentsCount: 1, firstInstallmentDate: now, idempotencyKey: `key-${index}` };
}

function installment(index: number): CardInstallment {
  return { id: `installment-${index}`, userId: "user-1", createdAt: now, updatedAt: now, purchaseId: `purchase-${index}`, cardId: card.id, invoiceId: "invoice-1", installmentNumber: 1, installmentsCount: 1, amountInCents: 1000 + index, dueDate: now, description: `Compra ${index}`, status: "OPEN" };
}

function renderInvoice(overrides: Partial<Parameters<typeof InvoiceView>[0]> = {}) {
  const props: Parameters<typeof InvoiceView>[0] = {
    card, categories: [], installments: [], invoice: invoice(), invoiceView: defaultInvoiceView,
    onEditPurchase: vi.fn(), onPayInvoice: vi.fn(), onRemoveInvoice: vi.fn(), onRemovePurchase: vi.fn(), onViewChange: vi.fn(), payments: [], purchases: [],
    ...overrides,
  };
  render(<InvoiceView {...props} />);
  return props;
}

describe("InvoiceView", () => {
  it("exibe o estado vazio da fatura", () => {
    renderInvoice();
    expect(screen.getByRole("heading", { name: "Nenhum item na fatura" })).toBeInTheDocument();
  });

  it("agrupa uma fatura extensa e carrega os itens progressivamente", () => {
    const purchases = Array.from({ length: 35 }, (_, index) => purchase(index));
    renderInvoice({ installments: purchases.map((_, index) => installment(index)), purchases });
    expect(screen.getAllByRole("button", { name: /^Editar Compra/ })).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Mostrar mais" })).toBeInTheDocument();
  });

  it("resume uma fatura paga e bloqueia ações incompatíveis", () => {
    renderInvoice({ invoice: invoice("PAID", 120000) });
    const summary = screen.getByRole("region", { name: "Resumo da fatura" });
    expect(within(summary).getByText("Paga")).toBeInTheDocument();
    expect(within(summary).getByRole("button", { name: "Fatura paga" })).toBeDisabled();
    expect(within(summary).getByText("Restante")).toBeInTheDocument();
  });

  it("destaca uma fatura vencida e permite buscar itens", () => {
    const onViewChange = vi.fn();
    renderInvoice({ invoice: invoice("OVERDUE"), onViewChange });
    expect(screen.getByText("Vencida")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar item da fatura" }), { target: { value: "mercado" } });
    expect(onViewChange).toHaveBeenCalledWith("invoice-1", { query: "mercado", visible: 12 });
  });
});
