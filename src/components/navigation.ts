import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Gauge,
  Landmark,
  PiggyBank,
  ReceiptText,
  Repeat,
  Settings,
  Tags,
  Target,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  mobilePrimary?: boolean;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Visão geral",
    items: [{ label: "Início", to: "/app", icon: Gauge, mobilePrimary: true }],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Transações", to: "/app/transactions", icon: ReceiptText, mobilePrimary: true },
      { label: "Contas", to: "/app/accounts", icon: Landmark },
      { label: "Cartões", to: "/app/cards", icon: CreditCard, mobilePrimary: true },
      { label: "Recorrências", to: "/app/recurring", icon: Repeat },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { label: "Orçamentos", to: "/app/budgets", icon: PiggyBank },
      { label: "Metas", to: "/app/goals", icon: Target },
      { label: "Calendário", to: "/app/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Análises",
    items: [{ label: "Relatórios", to: "/app/reports", icon: BarChart3 }],
  },
  {
    label: "Organização",
    items: [{ label: "Categorias", to: "/app/categories", icon: Tags }],
  },
  {
    label: "Sistema",
    items: [{ label: "Configurações", to: "/app/settings", icon: Settings }],
  },
];

export const mobilePrimaryItems = navigationGroups.flatMap((group) => group.items).filter((item) => item.mobilePrimary);

export const mobileSecondaryGroups = navigationGroups
  .map((group) => ({ ...group, items: group.items.filter((item) => !item.mobilePrimary) }))
  .filter((group) => group.items.length > 0);

export function isNavigationPathActive(pathname: string, to: string) {
  return pathname === to || (to !== "/app" && pathname.startsWith(`${to}/`));
}

export function getNavigationTitle(pathname: string) {
  return navigationGroups.flatMap((group) => group.items).find((item) => isNavigationPathActive(pathname, item.to))?.label ?? "FinControl";
}
