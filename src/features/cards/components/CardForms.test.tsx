import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CardPurchaseInput } from "../services/cardsService";
import type { Category } from "../../../types/category";
import type { CreditCard } from "../../../types/creditCard";
import { PurchaseFormModal } from "./CardForms";

const now = new Date("2026-08-17T12:00:00");
const card: CreditCard = { id: "card-1", userId: "user-1", createdAt: now, updatedAt: now, name: "Principal", limitInCents: 100000, committedLimitInCents: 0, closingDay: 10, dueDay: 20, color: "#2563eb", status: "ACTIVE" };
const category: Category = { id: "category-1", userId: "user-1", createdAt: now, updatedAt: now, name: "Mercado", type: "EXPENSE", icon: "cart", color: "#10b981", status: "ACTIVE", isDefault: false };

function initialForm(installmentsCount = 1): CardPurchaseInput {
  return { cardId: card.id, categoryId: category.id, description: "Compra", amountInCents: 12000, purchaseDate: now, installmentsCount, firstInstallmentDate: now, idempotencyKey: "stable-key" };
}

function PurchaseHarness({ busy = false, editing = false, form: initial = initialForm(), onClose = vi.fn(), onSubmit = vi.fn() }: { busy?: boolean; editing?: boolean; form?: CardPurchaseInput; onClose?: () => void; onSubmit?: () => void }) {
  const [form, setForm] = useState(initial);
  return <PurchaseFormModal busy={busy} cards={[card]} categories={[category]} editing={editing} form={form} isOpen onChange={setForm} onClose={onClose} onSubmit={(event) => { event.preventDefault(); onSubmit(); }} />;
}

describe("PurchaseFormModal", () => {
  it("mantém a compra à vista simples e sem campos de parcelamento", () => {
    const onSubmit = vi.fn();
    render(<PurchaseHarness onSubmit={onSubmit} />);
    expect(screen.queryByLabelText("Quantidade de parcelas")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Primeira parcela")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Categoria")).toBeRequired();
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("revela as opções e o cálculo quando o usuário decide parcelar", () => {
    render(<PurchaseHarness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Parcelar compra" }));
    expect(screen.getByLabelText("Quantidade de parcelas")).toHaveValue(2);
    expect(screen.getByLabelText("Primeira parcela")).toBeVisible();
    expect(screen.getByText("Parcela estimada:")).toBeVisible();
  });

  it("abre uma compra parcelada para edição com os campos correspondentes", () => {
    render(<PurchaseHarness editing form={initialForm(3)} />);
    expect(screen.getByRole("checkbox", { name: "Parcelar compra" })).toBeChecked();
    expect(screen.getByLabelText("Quantidade de parcelas")).toHaveValue(3);
    expect(screen.getByLabelText("Cartão")).toBeDisabled();
  });

  it("cancela sem alterar os dados", () => {
    const onClose = vi.fn();
    render(<PurchaseHarness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Descrição")).toHaveValue("Compra");
  });

  it("protege alterações ao fechar pelo X ou Escape", () => {
    const onClose = vi.fn();
    render(<PurchaseHarness onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Compra alterada" } });
    expect(screen.getByText("Alterações não salvas")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("dialog", { name: "Descartar alterações?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Continuar editando" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.getByRole("dialog", { name: "Descartar alterações?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Continuar editando" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Nova compra no cartão" }), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Descartar alterações" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("exibe erros junto aos campos e foca o primeiro inválido", () => {
    render(<PurchaseHarness form={{ ...initialForm(), amountInCents: 0, description: "" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    const description = screen.getByLabelText("Descrição");
    expect(description).toHaveFocus();
    expect(description).toHaveAttribute("aria-invalid", "true");
    expect(description).toHaveAttribute("aria-describedby", "purchase-description-error");
    expect(screen.getByText("Descreva a compra para identificá-la na fatura.")).toBeVisible();
  });

  it("configura o foco inicial e bloqueia fechamento durante submissão", () => {
    const onClose = vi.fn();
    const { unmount } = render(<PurchaseHarness onClose={onClose} />);
    expect(screen.getByLabelText("Descrição")).toHaveFocus();
    unmount();
    render(<PurchaseHarness busy onClose={onClose} />);
    expect(screen.getByRole("button", { name: "Fechar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
  });
});
