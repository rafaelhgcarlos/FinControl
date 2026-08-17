import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { CreditCard } from "../../../types/creditCard";
import { CardVisual } from "./CardVisual";
import { getLimitUsage } from "./LimitUsage";

const now = new Date("2026-08-17T12:00:00Z");
const card: CreditCard = {
  brand: "VISA",
  closingDay: 10,
  color: "#2563eb",
  committedLimitInCents: 25000,
  createdAt: now,
  dueDay: 20,
  id: "card-1",
  institution: "Banco Teste",
  lastFour: "1234",
  limitInCents: 100000,
  name: "Principal",
  status: "ACTIVE",
  updatedAt: now,
  userId: "user-1",
};

describe("CardVisual", () => {
  it("mantém a compra como ação principal e agrupa as demais em menu acessível", () => {
    const onEdit = vi.fn();
    render(<MemoryRouter><CardVisual card={card} onArchive={vi.fn()} onDelete={vi.fn()} onEdit={onEdit} onPurchase={vi.fn()} /></MemoryRouter>);

    expect(screen.getByRole("button", { name: "Registrar compra" })).toBeVisible();
    expect(screen.queryByRole("menuitem", { name: "Editar cartão" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mais ações" }));
    const edit = screen.getByRole("menuitem", { name: "Editar cartão" });
    expect(edit).toHaveFocus();
    expect(screen.getByRole("menuitem", { name: "Arquivar cartão" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Apagar cartão" })).toBeVisible();
    fireEvent.keyDown(edit, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mais ações" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Mais ações" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar cartão" }));
    expect(onEdit).toHaveBeenCalledWith(card);
  });

  it("expõe o uso real do limite para tecnologias assistivas", () => {
    render(<MemoryRouter><CardVisual card={card} onArchive={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onPurchase={vi.fn()} /></MemoryRouter>);
    const progress = screen.getByRole("progressbar", { name: "Percentual do limite utilizado" });
    expect(progress).toHaveAttribute("aria-valuenow", "25000");
    expect(screen.getByText(/25% de/)).toBeInTheDocument();
  });
});

describe("getLimitUsage", () => {
  it.each([
    [{ committedLimitInCents: 0, limitInCents: 0 }, { availableInCents: 0, exceeded: false, percent: 0 }],
    [{ committedLimitInCents: 100000, limitInCents: 100000 }, { availableInCents: 0, exceeded: false, percent: 100 }],
    [{ committedLimitInCents: 125000, limitInCents: 100000 }, { availableInCents: -25000, exceeded: true, percent: 125 }],
  ])("calcula corretamente os limites zero, completo e excedido", (input, expected) => {
    expect(getLimitUsage(input)).toEqual(expected);
  });
});
