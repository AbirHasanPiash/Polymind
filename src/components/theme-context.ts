import { createContext, useContext } from "react";

export type Theme = "dark" | "light" | "system";

/** Must match the key read by the bootstrap script in index.html. */
export const THEME_STORAGE_KEY = "vite-ui-theme";

export type ThemeContextValue = {
  /** The user's preference, which may be "system". */
  theme: Theme;
  /** What is actually on screen right now. */
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
