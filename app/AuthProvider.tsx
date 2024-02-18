"use client";
import { CONVEX_SERVER_URL } from "@/lib/server";
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createContext } from "react";

const ClientAuthContext = createContext<{
  token: string | null;
  refreshAuth: () => Promise<string | null>;
  signOut: () => Promise<void>;
}>(undefined as any);

export function useAuthClient() {
  return useContext(ClientAuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const refreshAuth = useCallback(async () => {
    const token = await fetchToken();
    setToken(token);
    return token;
  }, []);
  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);
  const signOut = useCallback(async () => {
    await forceSignOut();
    setToken(null);
  }, []);
  return (
    <ClientAuthContext.Provider value={{ token, refreshAuth, signOut }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useAuth() {
  const { token, refreshAuth } = useAuthClient();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) {
        return await refreshAuth();
      }
      return token;
    },
    [token, refreshAuth]
  );
  return useMemo(
    () => ({
      isLoading: false,
      isAuthenticated: token !== null,
      fetchAccessToken,
    }),
    [fetchAccessToken, token]
  );
}

async function fetchToken() {
  const response = await fetch(CONVEX_SERVER_URL + "/auth/token", {
    credentials: "include",
  });
  return await response.text();
}

async function forceSignOut() {
  await fetch(CONVEX_SERVER_URL + "/auth/signOut", {
    method: "POST",
    credentials: "include",
  });
}
