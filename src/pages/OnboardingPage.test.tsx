import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingPage } from "./OnboardingPage";

const mocks = vi.hoisted(() => ({
  createAccount: vi.fn(),
  createCard: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  listAccounts: vi.fn(),
  listCards: vi.fn(),
  profile: { onboardingStatus: "IN_PROGRESS", onboardingStep: 1 },
  saveOnboarding: vi.fn(),
  success: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({
  profile: mocks.profile,
  saveOnboarding: mocks.saveOnboarding,
  user: { uid: "user-a" },
}) }));
vi.mock("../contexts/ToastContext", () => ({ useToast: () => ({ error: mocks.error, info: mocks.info, success: mocks.success }) }));
vi.mock("../services/accountsService", async (importOriginal) => ({ ...await importOriginal<typeof import("../services/accountsService")>(), createAccount: mocks.createAccount, listAccounts: mocks.listAccounts }));
vi.mock("../features/cards", () => ({ createCard: mocks.createCard, listCards: mocks.listCards }));

function renderPage() {
  return render(<MemoryRouter initialEntries={["/app/onboarding"]}><OnboardingPage /></MemoryRouter>);
}

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profile.onboardingStatus = "IN_PROGRESS";
    mocks.profile.onboardingStep = 1;
    mocks.listAccounts.mockResolvedValue([]);
    mocks.listCards.mockResolvedValue([]);
  });

  it("skips without creating financial data", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Bem-vindo ao FinControl" });
    fireEvent.click(screen.getByRole("button", { name: "Pular por agora" }));
    await waitFor(() => expect(mocks.saveOnboarding).toHaveBeenCalledWith("SKIPPED", 1, expect.any(Date)));
    expect(mocks.createAccount).not.toHaveBeenCalled();
    expect(mocks.createCard).not.toHaveBeenCalled();
  });

  it("recognizes an existing account and does not duplicate it", async () => {
    mocks.listAccounts.mockResolvedValue([{ id: "account-a", userId: "user-a", name: "Conta existente", currentBalanceInCents: 1000, initialBalanceInCents: 1000, type: "CHECKING", institution: null, color: "#059669", icon: "Landmark", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() }]);
    renderPage();
    await screen.findByRole("heading", { name: "Bem-vindo ao FinControl" });
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    expect(await screen.findByRole("heading", { name: "Deseja adicionar um cartão?" })).toBeInTheDocument();
    expect(mocks.createAccount).not.toHaveBeenCalled();
    expect(mocks.saveOnboarding).toHaveBeenCalledWith("IN_PROGRESS", 3);
  });

  it("creates the first account through the regular service", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Bem-vindo ao FinControl" });
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cadastrar conta" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Conta principal" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(mocks.createAccount).toHaveBeenCalledWith("user-a", expect.objectContaining({ name: "Conta principal" })));
  });

  it("resumes from the persisted step on another session", async () => {
    mocks.profile.onboardingStep = 3;
    renderPage();
    expect(await screen.findByRole("heading", { name: "Deseja adicionar um cartão?" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bem-vindo ao FinControl" })).not.toBeInTheDocument();
  });
});
