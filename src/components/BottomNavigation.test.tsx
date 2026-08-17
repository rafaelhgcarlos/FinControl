import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { BottomNavigation } from "./BottomNavigation";

function renderNavigation(pathname = "/app") {
  const onNewEntry = vi.fn();
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <BottomNavigation onNewEntry={onNewEntry} />
    </MemoryRouter>,
  );
  return onNewEntry;
}

describe("BottomNavigation", () => {
  it("prioriza os cinco acessos mobile e reutiliza o launcher global", () => {
    const onNewEntry = renderNavigation();
    const navigation = screen.getByRole("navigation", { name: "Navegação inferior" });

    expect(within(navigation).getByRole("link", { name: "Início" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Transações" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Cartões" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Mais" })).toBeInTheDocument();

    fireEvent.click(within(navigation).getByRole("button", { name: "Lançar" }));
    expect(onNewEntry).toHaveBeenCalledOnce();
  });

  it("abre os modulos secundarios, mantem foco no dialogo e fecha ao navegar", () => {
    renderNavigation();
    fireEvent.click(screen.getByRole("button", { name: "Mais" }));

    const dialog = screen.getByRole("dialog", { name: "Mais opções" });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(within(dialog).getByRole("link", { name: "Contas" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Categorias" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Configurações" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: "Cartões" })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("link", { name: "Categorias" }));
    expect(screen.queryByRole("dialog", { name: "Mais opções" })).not.toBeInTheDocument();
  });

  it("marca Cartões em rota filha e Mais em rota secundária", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/app/cards/card-123"]}>
        <BottomNavigation onNewEntry={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Cartões" })).toHaveAttribute("aria-current", "page");

    unmount();
    renderNavigation("/app/settings");
    expect(screen.getByRole("button", { name: "Mais" })).toHaveAttribute("aria-current", "page");
  });
});
