import type { PropsWithChildren } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./ThemeContext";
import { AuthProvider } from "./AuthContext";
import { SyncProvider } from "./SyncContext";
import { AdminProvider } from "./AdminContext";
import { ToastProvider } from "./ToastContext";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminProvider><SyncProvider><ToastProvider><BrowserRouter>{children}</BrowserRouter></ToastProvider></SyncProvider></AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
