import { CalendarDays, Landmark, PiggyBank, Target } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ProtectedRoute, PublicOnlyRoute } from "../components/ProtectedRoute";
import { AccountsPage } from "../pages/AccountsPage";
import { ForgotPasswordPage, LoginPage, RegisterPage } from "../pages/AuthPages";
import { CategoriesPage } from "../pages/CategoriesPage";
import { CardsPage } from "../pages/CardsPage";
import { DashboardPage } from "../pages/DashboardPage";
import { FeaturePage } from "../pages/FeaturePage";
import { LandingPage } from "../pages/LandingPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TransactionsPage } from "../pages/TransactionsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="cards/:cardId" element={<CardsPage />} />
          <Route path="budgets" element={<FeaturePage title="Orcamentos" description="Planeje limites de gastos por categoria." icon={PiggyBank} />} />
          <Route path="goals" element={<FeaturePage title="Metas" description="Defina objetivos e acompanhe sua evolucao." icon={Target} />} />
          <Route path="calendar" element={<FeaturePage title="Calendario" description="Visualize vencimentos, recorrencias e parcelas." icon={CalendarDays} />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/admin" element={<FeaturePage title="Administracao" description="Area administrativa restrita." icon={Landmark} />} />
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
