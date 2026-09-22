import { createContext, useContext, type Dispatch, type SetStateAction } from "react";

import type { Preferences, User } from "../api/types";

export type { User } from "../api/types";

export type AuthContextValue = {
  user: User | null;
  token: string | null;
  /** True once the initial session check has finished. */
  isLoading: boolean;
  /** True only when a valid session was confirmed by the API. */
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  /** Persist a partial preference change and update the local user. */
  updatePreferences: (patch: Partial<Preferences>) => Promise<void>;
  setUser: Dispatch<SetStateAction<User | null>>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
