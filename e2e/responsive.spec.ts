import { expect, test } from "@playwright/test";
import { openGlobalLauncher, registerDisposableUser } from "./helpers";

test("launcher, cancelamento, responsividade e dark mode", async ({ page }, testInfo) => {
  await registerDisposableUser(page, testInfo.project.name);
  const mobile = testInfo.project.name === "mobile-chromium";

  await openGlobalLauncher(page, mobile);
  const dialog = page.getByRole("dialog", { name: "Novo lancamento" });
  await expect(dialog.getByRole("button", { name: /Despesa/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await openGlobalLauncher(page, mobile);
  await dialog.getByRole("button", { name: /Compra no cartao/ }).click();
  await expect(page).toHaveURL(/\/app\/cards(?:\?new=purchase)?$/);
  await expect(page.getByText("Controle seus cartoes sem misturar faturas de bancos diferentes.")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Nova compra no cartao" })).toBeVisible();

  await page.goto("/app/settings");
  await page.getByLabel("Tema").selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  if (mobile) {
    const bottomNavigation = page.getByRole("navigation", { name: "Navegação inferior" });
    await expect(bottomNavigation).toBeVisible();
    await expect(bottomNavigation.getByRole("link", { name: "Cartões" })).toBeVisible();
    await bottomNavigation.getByRole("button", { name: "Mais" }).click();
    const moreDialog = page.getByRole("dialog", { name: "Mais opções" });
    await expect(moreDialog.getByRole("link", { name: "Categorias" })).toBeVisible();
    await expect(moreDialog.getByRole("link", { name: "Configurações" })).toBeVisible();
    await moreDialog.getByRole("button", { name: "Fechar" }).click();
  } else {
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  }
});
