import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

vi.mock("../contexts/AdminContext", () => ({ useAdmin: () => ({ isAdmin: false, loading: false }) }));

describe("Sidebar", () => {
  it("usa a nova taxonomia e mantem rotas filhas ativas", () => {
    render(
      <MemoryRouter initialEntries={["/app/cards/card-123"]}>
        <Sidebar mobile />
      </MemoryRouter>,
    );

    const planning = screen.getByText("Planejamento").parentElement;
    const organization = screen.getByText("Organização").parentElement;
    const analyses = screen.getByText("Análises").parentElement;
    const system = screen.getByText("Sistema").parentElement;

    expect(planning).not.toBeNull();
    expect(organization).not.toBeNull();
    expect(analyses).not.toBeNull();
    expect(system).not.toBeNull();
    expect(within(planning as HTMLElement).queryByRole("link", { name: "Categorias" })).not.toBeInTheDocument();
    expect(within(organization as HTMLElement).getByRole("link", { name: "Categorias" })).toBeInTheDocument();
    expect(within(analyses as HTMLElement).queryByRole("link", { name: "Configurações" })).not.toBeInTheDocument();
    expect(within(system as HTMLElement).getByRole("link", { name: "Configurações" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cartões" })).toHaveAttribute("aria-current", "page");
  });

  it("notifica o drawer ao navegar por teclado ou clique", () => {
    const onNavigate = vi.fn();
    render(
      <MemoryRouter>
        <Sidebar mobile onNavigate={onNavigate} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Relatórios" }));
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
