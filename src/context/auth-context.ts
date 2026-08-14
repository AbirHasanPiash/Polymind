import { createContext, useContext, type Dispatch, type SetStateAction } from "react";

export type Wallet = {
  id?: string;
  /** Sent as a string by the API to preserve decimal precision. */
  credits: number | string;
};

export type User = {
  id: string;
  email: string;
  full_name?: string | null;
  is_active?: boolean;
  is_superuser: boolean;
  wallet?: Wallet | null;
};

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
  setUser: Dispatch<SetStateAction<User | null>>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
