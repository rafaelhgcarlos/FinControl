import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CardNotFound } from "./CardDetailView";

describe("CardNotFound", () => {
  it("orienta o retorno quando o identificador do cartão é inválido", () => {
    render(<MemoryRouter><CardNotFound /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Cartão não encontrado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para cartões" })).toHaveAttribute("href", "/app/cards");
  });
});
