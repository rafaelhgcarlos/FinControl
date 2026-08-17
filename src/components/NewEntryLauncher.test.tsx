import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewEntryLauncher, newEntryDestinations } from "./NewEntryLauncher";

describe("NewEntryLauncher", () => {
  it.each([
    ["Despesa", newEntryDestinations.expense],
    ["Receita", newEntryDestinations.income],
    ["Compra no cartao", newEntryDestinations.cardPurchase],
    ["Transferencia", newEntryDestinations.transfer],
  ])("abre o fluxo correto para %s", (label, destination) => {
    const onSelect = vi.fn();
    render(<NewEntryLauncher isOpen onClose={vi.fn()} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(label) }));

    expect(onSelect).toHaveBeenCalledWith(destination);
  });

  it("cancela sem selecionar um fluxo", () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    render(<NewEntryLauncher isOpen onClose={onClose} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("fecha com Escape e mantem foco dentro do dialogo", () => {
    const onClose = vi.fn();
    render(<NewEntryLauncher isOpen onClose={onClose} onSelect={vi.fn()} />);
    const dialog = screen.getByRole("dialog");

    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
