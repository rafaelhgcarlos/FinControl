import { expect, test } from "@playwright/test";
import { fillCurrency, testPassword } from "./helpers";

test("novo usuário cria a primeira conta e conclui sem cartão", async ({ page }) => {
  const email = `onboarding-${Date.now()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Usuario Onboarding");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(testPassword);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/app\/onboarding$/);

  await page.getByRole("button", { name: "Começar" }).click();
  await page.getByRole("button", { name: "Cadastrar conta" }).click();
  await page.getByLabel("Nome").fill("Conta do onboarding");
  await page.getByTitle("Carteira").click();
  await expect(page.getByRole("radio", { name: "Carteira" })).toBeChecked();
  await fillCurrency(page, "Saldo inicial", 25000);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Deseja adicionar um cartão?" })).toBeVisible();
  await page.getByRole("button", { name: "Agora não" }).click();
  await page.getByRole("button", { name: "Ir para o início" }).click();
  await expect(page).toHaveURL(/\/app$/);

  await page.reload();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/accounts");
  await expect(page.getByRole("table").getByText("Conta do onboarding")).toBeVisible();
});

test("novo usuário pode pular sem criar dados", async ({ page }) => {
  const email = `onboarding-skip-${Date.now()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Usuario Skip");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(testPassword);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/app\/onboarding$/);
  await page.getByRole("button", { name: "Pular por agora" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/accounts");
  await expect(page.getByText("Nenhuma conta cadastrada")).toBeVisible();

  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Rever introdução" }).click();
  await expect(page).toHaveURL(/\/app\/onboarding\?review=1$/);
  await expect(page.getByRole("heading", { name: "Bem-vindo ao FinControl" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar introdução" }).click();
  await expect(page).toHaveURL(/\/app\/settings$/);
});

test("novo usuário cria conta e cartão com proteção contra descarte", async ({ page }) => {
  const email = `onboarding-card-${Date.now()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Usuario Cartao");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(testPassword);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByRole("button", { name: "Começar" }).click();
  await page.getByRole("button", { name: "Cadastrar conta" }).click();
  await page.getByLabel("Nome").fill("Conta principal onboarding");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await page.getByRole("button", { name: "Adicionar cartão" }).click();
  const cardDialog = page.getByRole("dialog", { name: "Novo cartão" });
  await cardDialog.getByLabel("Nome").fill("Cartão onboarding");
  await cardDialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("dialog", { name: "Descartar alterações?" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar editando" }).click();
  await fillCurrency(cardDialog, "Limite", 150000);
  await cardDialog.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("heading", { name: "Tudo pronto para começar" })).toBeVisible();
  await page.getByRole("button", { name: "Ir para o início" }).click();

  await page.goto("/app/cards");
  await expect(page.getByText("Cartão onboarding")).toBeVisible();
});
