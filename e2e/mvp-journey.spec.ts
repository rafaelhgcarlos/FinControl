import { expect, test } from "@playwright/test";
import { fillCurrency, openGlobalLauncher, registerDisposableUser, seedFinancialJourney, testPassword } from "./helpers";

test.setTimeout(120_000);

test("jornada financeira integrada, isolada e descartavel", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "A jornada completa roda uma vez no desktop.");
  await registerDisposableUser(page, "desktop");
  await expect(page.getByRole("heading", { name: "Ola, Usuario" })).toBeVisible();

  await page.goto("/app/accounts");
  await expect(page.getByText("Nenhuma conta cadastrada")).toBeVisible();
  await page.getByRole("button", { name: "Criar primeira conta" }).click();
  await page.getByLabel("Nome").fill("Conta principal");
  await fillCurrency(page, "Saldo inicial", 50_000);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Conta criada.")).toBeVisible();

  await page.getByRole("button", { name: "Nova conta" }).click();
  await page.getByLabel("Nome").fill("Reserva");
  await fillCurrency(page, "Saldo inicial", 10_000);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("table").getByText("Reserva")).toBeVisible();

  await page.goto("/app/categories");
  await expect(page.locator("main > div > header").getByRole("heading", { name: "Categorias" })).toBeVisible();
  await expect(page.getByRole("table").getByText("Alimentacao").or(page.getByRole("table").getByText("Alimentação"))).toBeVisible();

  await page.goto("/app");
  await openGlobalLauncher(page);
  await page.getByRole("button", { name: /Receita/ }).click();
  let transactionDialog = page.getByRole("dialog", { name: "Novo lançamento" });
  await expect(transactionDialog).toBeVisible();
  await expect(transactionDialog.getByLabel("Tipo")).toHaveValue("INCOME");
  await expect(transactionDialog.getByLabel("Descrição")).toHaveCount(0);
  await transactionDialog.getByRole("button", { name: "Mais opções" }).click();
  await expect(transactionDialog.getByLabel("Descrição")).toBeVisible();
  await transactionDialog.getByRole("button", { name: "Cancelar" }).click();

  await openGlobalLauncher(page);
  await page.getByRole("button", { name: /Despesa/ }).click();
  transactionDialog = page.getByRole("dialog", { name: "Novo lançamento" });
  await expect(transactionDialog.getByLabel("Tipo")).toHaveValue("EXPENSE");
  await transactionDialog.getByRole("button", { name: "Cancelar" }).click();

  await openGlobalLauncher(page);
  await page.getByRole("button", { name: /Transferencia/ }).click();
  transactionDialog = page.getByRole("dialog", { name: "Novo lançamento" });
  await expect(transactionDialog.getByLabel("Tipo")).toHaveValue("TRANSFER");
  await expect(transactionDialog.getByLabel("Conta de origem")).toBeVisible();
  await expect(transactionDialog.getByLabel("Conta de destino")).toBeVisible();
  await transactionDialog.getByRole("button", { name: "Cancelar" }).click();

  await seedFinancialJourney();

  await page.reload();
  await expect(page.getByRole("table").getByText("Receita E2E")).toBeVisible();
  await expect(page.getByRole("table").getByText("Despesa E2E")).toBeVisible();
  await expect(page.getByRole("table").getByText("Transferencia E2E")).toBeVisible();
  await page.getByLabel("Descricao").fill("resultado inexistente");
  await expect(page.getByRole("button", { name: "Limpar filtros" })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.getByRole("table").getByText("Receita E2E")).toBeVisible();

  await page.goto("/app/accounts");
  await expect(page.getByRole("table").getByText("R$ 1.150,00")).toBeVisible();
  await expect(page.getByRole("table").getByText("R$ 200,00")).toBeVisible();

  await page.goto("/app/cards");
  await expect(page.getByText("Cartao E2E")).toBeVisible();
  await expect(page.getByText("R$ 300,00", { exact: true })).toBeVisible();

  await openGlobalLauncher(page);
  await page.getByRole("button", { name: /Compra no cartao/ }).click();
  const purchaseDialog = page.getByRole("dialog", { name: "Nova compra no cartão" });
  await expect(purchaseDialog).toBeVisible();
  await expect(purchaseDialog.getByLabel("Cartão")).toHaveValue("e2e-card");
  await purchaseDialog.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("link", { name: /Cartao E2E/ }).click();
  await expect(page.getByText("Compra parcelada E2E").first()).toBeVisible();
  await expect(page.getByText("1/3", { exact: true })).toBeVisible();

  await page.goto("/app/recurring");
  await expect(page.getByText("Recorrencia E2E")).toBeVisible();

  await page.goto("/app/budgets");
  await expect(page.getByText("Orcamento E2E")).toBeVisible();
  await expect(page.getByText("110%")).toBeVisible();

  await page.goto("/app/goals");
  await expect(page.getByText("Meta E2E")).toBeVisible();
  await expect(page.getByText("20%")).toBeVisible();

  for (const [path, heading] of [["/app/calendar", "Calendário financeiro"], ["/app/reports", "Relatórios"], ["/app/settings", "Configurações"]] as const) {
    await page.goto(path);
    await expect(page.locator("main > div > header").getByRole("heading", { name: heading })).toBeVisible();
  }

  await page.getByLabel("Tema").selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await context.setOffline(true);
  await expect(page.getByRole("status", { name: "Offline" })).toBeVisible();
  await context.setOffline(false);

  await page.locator("main > header").getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Usuario Isolado");
  await page.getByLabel("E-mail").fill(`isolated-${Date.now()}@example.test`);
  await page.getByLabel("Senha").fill(testPassword);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/accounts");
  await expect(page.getByText("Nenhuma conta cadastrada")).toBeVisible();
  await expect(page.getByText("Conta principal")).toHaveCount(0);
});
