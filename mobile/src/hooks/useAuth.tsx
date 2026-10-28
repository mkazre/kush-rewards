// Session state for the whole app. Browsing needs no account; adding a store,
// reporting, reviewing and the admin panel need one.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/endpoints";
import { setUnauthorizedHandler } from "../api/client";
import { tokenStore } from "../lib/storage";
import type { AuthResponse, User } from "../types/api";

export type AuthState =
  | { type: "loading" }
  | { type: "authenticated"; user: User }
  | { type: "unauthenticated" };

type AuthCtx = {
  authState: AuthState;
  /** Store the token and user returned by any sign-in endpoint. */
  onSignedIn: (res: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  /** Replace the signed-in user after a profile change (e.g. terms accepted). */
  updateUser: (user: User) => void;
  /** Delete the account on the server, then sign out locally. Throws on failure. */
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>({ type: "loading" });

  const dropSession = useCallback(async () => {
    await tokenStore.clear();
    setAuthState({ type: "unauthenticated" });
    queryClient.removeQueries({ queryKey: ["reviews"] });
    queryClient.removeQueries({ queryKey: ["submissions"] });
    queryClient.removeQueries({ queryKey: ["admin"] });
  }, [queryClient]);

  // Restore the session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await tokenStore.get();
      if (!token) {
        if (!cancelled) setAuthState({ type: "unauthenticated" });
        return;
      }
      try {
        const { user } = await api.session();
        if (!cancelled) setAuthState({ type: "authenticated", user });
      } catch {
        if (!cancelled) await dropSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dropSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      dropSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [dropSession]);

  const onSignedIn = useCallback(
    async (res: AuthResponse) => {
      await tokenStore.set(res.token);
      setAuthState({ type: "authenticated", user: res.user });
      // Lists include per-user fields (isMine), so refetch them for the new user.
      queryClient.invalidateQueries();
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* the token is dropped locally either way */
    }
    await dropSession();
    queryClient.invalidateQueries();
  }, [dropSession, queryClient]);

  const updateUser = useCallback((user: User) => setAuthState({ type: "authenticated", user }), []);

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    await dropSession();
    queryClient.invalidateQueries();
  }, [dropSession, queryClient]);

  const value = useMemo(
    () => ({ authState, onSignedIn, logout, updateUser, deleteAccount }),
    [authState, onSignedIn, logout, updateUser, deleteAccount]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
