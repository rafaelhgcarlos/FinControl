import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountIcon, AccountIconPicker } from "./AccountIconPicker";

describe("AccountIconPicker", () => {
  it("exibe opções visuais acessíveis e comunica a seleção", () => {
    const onChange = vi.fn();
    render(<AccountIconPicker id="account-icon" onChange={onChange} value="Landmark" />);

    expect(screen.getByRole("radio", { name: "Banco" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Carteira" }));
    expect(onChange).toHaveBeenCalledWith("Wallet");
  });

  it("usa o ícone de banco como fallback para registros legados", () => {
    const { container } = render(<AccountIcon name="LegacyUnknownIcon" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
