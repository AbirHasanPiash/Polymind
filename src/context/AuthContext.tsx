import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import api, { TOKEN_STORAGE_KEY, UNAUTHORIZED_EVENT, getStoredToken, setStoredToken } from "../api/client";
import { AuthContext, type AuthContextValue, type User } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getStoredToken()));

  // Guards against a slow profile request landing after the user signed out.
  const requestId = useRef(0);

  const clearSession = useCallback(() => {
    requestId.current++;
    setStoredToken(null);
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const fetchProfile = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const { data } = await api.get<User>("/users/me");
      if (id === requestId.current) setUser(data);
    } catch {
      // A 401 is handled by the response interceptor, which clears the session.
      // Any other failure (network, 503) must not sign the user out. The
      // previous version swallowed every error and left a token with no user,
      // so guarded routes admitted the user and every page rendered empty.
    }
  }, []);

  const login = useCallback((newToken: string) => {
    setStoredToken(newToken);
    setToken(newToken);
    setIsLoading(true);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  /** Stable identity, so callers can safely list this in an effect's deps.
   *  As an inline function it changed on every render, and any effect
   *  depending on it re-ran forever (the payment success page refetched the
   *  profile in a loop). */
  const refreshProfile = useCallback(async () => {
    if (!getStoredToken()) return;
    await fetchProfile();
  }, [fetchProfile]);

  // Load the profile whenever the token changes (mount, sign-in, token replaced
  // in another tab). Clearing state on sign-out happens in clearSession, so this
  // effect never has to set state synchronously.
  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const load = async () => {
      await fetchProfile();
      if (!cancelled) setIsLoading(false);
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [token, fetchProfile]);

  // Raised by the API client when the backend rejects the stored token.
  useEffect(() => {
    const onUnauthorized = () => clearSession();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [clearSession]);

  // Keep tabs in sync: signing out in one tab signs out the others.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TOKEN_STORAGE_KEY) return;
      if (event.newValue) {
        setToken(event.newValue);
        setIsLoading(true);
      } else {
        clearSession();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshProfile,
      setUser,
    }),
    [user, token, isLoading, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
