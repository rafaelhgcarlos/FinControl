import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { getAdminMembership } from "../services/adminService";
import { useAuth } from "./AuthContext";

type AdminContextValue = { isAdmin: boolean; loading: boolean };
const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: PropsWithChildren) {
  const { user } = useAuth(); const [isAdmin, setIsAdmin] = useState(false); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true);
    if (!user) { setIsAdmin(false); setLoading(false); return () => { active = false; }; }
    void getAdminMembership(user.uid).then((value) => { if (active) setIsAdmin(value); }).catch(() => { if (active) setIsAdmin(false); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);
  const value = useMemo(() => ({ isAdmin, loading }), [isAdmin, loading]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
export function useAdmin() { const value = useContext(AdminContext); if (!value) throw new Error("useAdmin deve ser usado dentro de AdminProvider."); return value; }
