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
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  fetchAccessToken: ({
    forceRefreshToken,
  }: {
    forceRefreshToken: boolean;
  }) => Promise<string | null>;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}>(undefined as any);

export function useAuthClient() {
  return useContext(ClientAuthContext);
}

let token: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) {
        token = await fetchToken();
        setIsLoading(false);
        if (token !== null) {
          setIsAuthenticated(true);
        }
      }
      return token;
    },
    []
  );
  const refreshAuth = useCallback(async () => {
    void fetchAccessToken({ forceRefreshToken: true });
  }, [fetchAccessToken]);
  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);
  const signOut = useCallback(async () => {
    await forceSignOut();
    token = null;
    setIsAuthenticated(false);
  }, []);

  return (
    <ClientAuthContext.Provider
      value={{
        isLoading,
        isAuthenticated,
        token,
        fetchAccessToken,
        refreshAuth,
        signOut,
      }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useAuth() {
  const { isLoading, isAuthenticated, fetchAccessToken } = useAuthClient();
  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      fetchAccessToken,
    }),
    [fetchAccessToken, isLoading, isAuthenticated]
  );
}

async function fetchToken() {
  const response = await fetch(CONVEX_SERVER_URL + "/auth/token", {
    credentials: "include",
  });
  const token = await response.text();
  return token.length > 0 ? token : null;
}

async function forceSignOut() {
  await fetch(CONVEX_SERVER_URL + "/auth/signOut", {
    method: "POST",
    credentials: "include",
  });
}
