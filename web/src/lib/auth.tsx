// Session state for the website. The cookie is HTTP-only; we learn who is signed in from /auth/session.
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthResponse, User } from "@shared/types/api";
import { api, setUnauthorizedHandler } from "./api";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signedIn: (res: AuthResponse) => void;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    api
      .session()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const signedIn = useCallback(
    (res: AuthResponse) => {
      setUser(res.user);
      qc.invalidateQueries();
    },
    [qc]
  );

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    qc.clear();
  }, [qc]);

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    setUser(null);
    qc.clear();
  }, [qc]);

  const updateUser = useCallback((patch: Partial<User>) => setUser((u) => (u ? { ...u, ...patch } : u)), []);

  const value = useMemo(() => ({ user, loading, signedIn, signOut, updateUser, deleteAccount }), [user, loading, signedIn, signOut, updateUser, deleteAccount]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
