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
    await expect(page.getByRole("navigation", { name: "Navegacao inferior" })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "Navegacao principal" })).toBeVisible();
  }
});
