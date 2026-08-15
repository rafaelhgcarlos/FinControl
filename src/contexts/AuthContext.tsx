import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useContext, useEffect, useMemo, useState, createContext, type Context, type PropsWithChildren } from "react";
import { firebaseAuth } from "../firebase/config";
import { ensureDefaultCategories } from "../services/categoriesService";
import { getUserProfile, ensureUserProfile, updateUserProfile } from "../services/userService";
import type { UserProfile, UserProfileUpdate } from "../types/user";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  saveProfile: (changes: UserProfileUpdate) => Promise<void>;
};

const authContextKey = "__fincontrol_auth_context__";
const globalAuthContext = globalThis as typeof globalThis & { [authContextKey]?: Context<AuthContextValue | undefined> };
const AuthContext = globalAuthContext[authContextKey] ?? createContext<AuthContextValue | undefined>(undefined);
globalAuthContext[authContextKey] = AuthContext;

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }
    const currentProfile = await getUserProfile(currentUser.uid);
    setProfile(currentProfile ?? (await ensureUserProfile(currentUser)));
    void ensureDefaultCategories(currentUser.uid).catch(() => undefined);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (currentUser) => {
      setUser(currentUser);
      void loadProfile(currentUser)
        .catch(() => setProfile(null))
        .finally(() => setLoading(false));
    });
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    loading,
    refreshProfile: async () => loadProfile(user),
    saveProfile: async (changes) => {
      if (!user) return;
      await updateUserProfile(user.uid, changes);
      await loadProfile(user);
    },
  }), [loadProfile, loading, profile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}
