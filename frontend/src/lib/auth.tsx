"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./api";
import { clearToken, getToken, setToken } from "./token";
import type { AuthResponse, AuthUser } from "./types";

interface AuthState {
  /** The signed-in player, or null for a guest. */
  user: AuthUser | null;
  /** True until we know whether a saved login is still valid. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, check a saved token. A guest has none and is ready at once.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch((err) => {
        // Only drop the token when the server says it is bad or expired. A
        // network blip should not sign someone out.
        if (err instanceof ApiError && err.status === 401) clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const accept = useCallback((res: AuthResponse) => {
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => accept(await api.login(email, password)),
    [accept]
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) =>
      accept(await api.register(email, password, displayName)),
    [accept]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
