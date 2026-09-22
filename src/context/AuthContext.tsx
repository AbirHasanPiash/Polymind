import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import api, {
  TOKEN_STORAGE_KEY,
  UNAUTHORIZED_EVENT,
  getStoredToken,
  setStoredToken,
  tokenSecondsRemaining,
} from "../api/client";
import { DEFAULT_PREFERENCES, type Preferences, type TokenResponse, type User } from "../api/types";
import { AuthContext, type AuthContextValue } from "./auth-context";

/** Refresh the token once less than this remains, while the tab is active. */
const REFRESH_THRESHOLD_SECONDS = 15 * 60;
const REFRESH_CHECK_MS = 60_000;

function withDefaults(user: User): User {
  return { ...user, preferences: { ...DEFAULT_PREFERENCES, ...(user.preferences ?? {}) } };
}

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
      if (id === requestId.current) setUser(withDefaults(data));
    } catch {
      // A 401 is handled by the response interceptor, which clears the session.
      // Any other failure (network, 503) must not sign the user out.
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

  const refreshProfile = useCallback(async () => {
    if (!getStoredToken()) return;
    await fetchProfile();
  }, [fetchProfile]);

  const updatePreferences = useCallback(
    async (patch: Partial<Preferences>) => {
      const current = user?.preferences ?? DEFAULT_PREFERENCES;
      const next = { ...current, ...patch };
      const { data } = await api.patch<User>("/users/me", { preferences: next });
      setUser(withDefaults(data));
    },
    [user?.preferences],
  );

  // Load the profile whenever the token changes (mount, sign-in, token replaced
  // in another tab).
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

  // Sliding sessions: while the tab is in use, swap the token for a fresh one
  // before it expires, so nobody is signed out mid-conversation.
  useEffect(() => {
    if (!token) return;

    const maybeRefresh = async () => {
      if (document.visibilityState !== "visible") return;
      const remaining = tokenSecondsRemaining(getStoredToken());
      if (remaining === null || remaining > REFRESH_THRESHOLD_SECONDS || remaining <= 0) return;
      try {
        const { data } = await api.post<TokenResponse>("/auth/refresh");
        setStoredToken(data.access_token);
        setToken(data.access_token);
      } catch {
        // The interceptor signs the user out on a real 401; anything else waits for the next tick.
      }
    };

    const timer = setInterval(() => void maybeRefresh(), REFRESH_CHECK_MS);
    document.addEventListener("visibilitychange", maybeRefresh);
    void maybeRefresh();
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", maybeRefresh);
    };
  }, [token]);

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
      updatePreferences,
      setUser,
    }),
    [user, token, isLoading, login, logout, refreshProfile, updatePreferences],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
