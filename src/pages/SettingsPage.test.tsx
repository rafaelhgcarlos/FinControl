import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "./SettingsPage";

const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  deleteUserAccount: vi.fn(),
  error: vi.fn(),
  logout: vi.fn(),
  saveProfile: vi.fn(),
  setPreference: vi.fn(),
  success: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: { id: "user-a", email: "ana@example.com", displayName: "Ana", locale: "pt-BR", currency: "BRL", timeZone: "America/Sao_Paulo" },
    saveProfile: mocks.saveProfile,
  }),
}));
vi.mock("../contexts/ThemeContext", () => ({ useTheme: () => ({ preference: "system", setPreference: mocks.setPreference }) }));
vi.mock("../contexts/ToastContext", () => ({ useToast: () => ({ error: mocks.error, success: mocks.success }) }));
vi.mock("../services/authService", () => ({ changePassword: mocks.changePassword, logout: mocks.logout }));
vi.mock("../services/userService", () => ({ deleteUserAccount: mocks.deleteUserAccount }));

function renderPage() {
  return render(<MemoryRouter><SettingsPage /></MemoryRouter>);
}

describe("SettingsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps profile saving disabled until the name changes", async () => {
    renderPage();
    const save = screen.getByRole("button", { name: /salvar perfil/i });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana Silva" } });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(mocks.saveProfile).toHaveBeenCalledWith({ displayName: "Ana Silva" }));
    expect(mocks.success).toHaveBeenCalled();
  });

  it("validates password confirmation without blocking logout", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: "senha-atual" } });
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "nova-senha" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "diferente" } });
    fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));
    expect(await screen.findByText("As senhas não conferem.")).toBeInTheDocument();
    expect(mocks.changePassword).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalled());
  });

  it("requires password and explicit text inside the deletion dialog", async () => {
    renderPage();
    expect(screen.queryByLabelText("Confirmação")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    const dialog = screen.getByRole("dialog", { name: "Excluir conta permanentemente?" });
    const confirm = within(dialog).getByRole("button", { name: "Excluir minha conta" });
    expect(confirm).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Senha atual"), { target: { value: "senha-atual" } });
    fireEvent.change(within(dialog).getByLabelText("Confirmação"), { target: { value: "EXCLUIR" } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(mocks.deleteUserAccount).toHaveBeenCalledWith("senha-atual", expect.any(Function)));
  });

  it("applies theme changes immediately", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /escuro/i }));
    expect(mocks.setPreference).toHaveBeenCalledWith("dark");
  });
});
