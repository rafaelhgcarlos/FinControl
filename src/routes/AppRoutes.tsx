import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { LandingPage } from "../pages/LandingPage";
import { ForgotPasswordPage, LoginPage, RegisterPage } from "../pages/AuthPages";
import { AppShell } from "../components/AppShell";
import { ProtectedRoute, PublicOnlyRoute } from "../components/ProtectedRoute";
import { FeaturePage } from "../pages/FeaturePage";
import { SettingsPage } from "../pages/SettingsPage";
import { BarChart3, CalendarDays, CreditCard, Landmark, PiggyBank, ReceiptText, Target } from "lucide-react";

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
          <Route path="transactions" element={<FeaturePage title="Histórico" description="Consulte e organize suas receitas, despesas e transferências." icon={ReceiptText} />} />
          <Route path="accounts" element={<FeaturePage title="Contas" description="Acompanhe saldos e movimentações das suas contas." icon={Landmark} />} />
          <Route path="cards" element={<FeaturePage title="Cartões" description="Gerencie cartões, limites e faturas." icon={CreditCard} />} />
          <Route path="budgets" element={<FeaturePage title="Orçamentos" description="Planeje limites de gastos por categoria." icon={PiggyBank} />} />
          <Route path="goals" element={<FeaturePage title="Metas" description="Defina objetivos e acompanhe sua evolução." icon={Target} />} />
          <Route path="calendar" element={<FeaturePage title="Calendário" description="Visualize vencimentos, recorrências e parcelas." icon={CalendarDays} />} />
          <Route path="reports" element={<FeaturePage title="Relatórios" description="Encontre padrões e acompanhe seus indicadores." icon={BarChart3} />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/admin" element={<FeaturePage title="Administração" description="Área administrativa restrita." icon={Landmark} />} />
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
