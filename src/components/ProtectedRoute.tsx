import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "./LoadingState";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState label="Carregando sua sessão..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label="Carregando..." />;
  return user ? <Navigate to="/app" replace /> : <Outlet />;
}
