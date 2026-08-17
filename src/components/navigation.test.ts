import { describe, expect, it } from "vitest";
import { getNavigationTitle, isNavigationPathActive, mobilePrimaryItems, mobileSecondaryGroups, navigationGroups } from "./navigation";

describe("navigation", () => {
  it("organiza os modulos na taxonomia definida", () => {
    expect(navigationGroups.map((group) => group.label)).toEqual([
      "Visão geral",
      "Financeiro",
      "Planejamento",
      "Análises",
      "Organização",
      "Sistema",
    ]);

    expect(navigationGroups.find((group) => group.label === "Organização")?.items.map((item) => item.label)).toContain("Categorias");
    expect(navigationGroups.find((group) => group.label === "Planejamento")?.items.map((item) => item.label)).not.toContain("Categorias");
    expect(navigationGroups.find((group) => group.label === "Sistema")?.items.map((item) => item.label)).toContain("Configurações");
    expect(navigationGroups.find((group) => group.label === "Análises")?.items.map((item) => item.label)).not.toContain("Configurações");
  });

  it("define os cinco papeis da navegacao mobile sem duplicar os destinos primarios em Mais", () => {
    expect(mobilePrimaryItems.map((item) => item.label)).toEqual(["Início", "Transações", "Cartões"]);
    expect(mobileSecondaryGroups.flatMap((group) => group.items).map((item) => item.label)).not.toEqual(expect.arrayContaining(["Início", "Transações", "Cartões"]));
  });

  it("mantem item e titulo ativos em rotas filhas", () => {
    expect(isNavigationPathActive("/app/cards/card-123", "/app/cards")).toBe(true);
    expect(isNavigationPathActive("/app/cards-extra", "/app/cards")).toBe(false);
    expect(getNavigationTitle("/app/cards/card-123")).toBe("Cartões");
  });
});
