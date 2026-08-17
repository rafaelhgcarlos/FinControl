import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("apresenta contexto e executa a proxima acao quando ela existe", () => {
    const onAction = vi.fn();
    render(<EmptyState action={<Button onClick={onAction}>Criar conta</Button>} description="Cadastre uma conta para começar." title="Nenhuma conta" />);

    expect(screen.getByRole("heading", { name: "Nenhuma conta" })).toBeInTheDocument();
    expect(screen.getByText("Cadastre uma conta para começar.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("nao renderiza uma acao enganosa quando ela nao foi fornecida", () => {
    render(<EmptyState description="Tente outro período." size="compact" title="Sem resultados" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
