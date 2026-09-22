import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

import { THEME_STORAGE_KEY, ThemeContext, type Theme } from "./theme-context";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredTheme(fallback: Theme): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" || stored === "system" ? stored : fallback;
  } catch {
    return fallback;
  }
}

function applyTheme(resolved: "dark" | "light") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  // Tells the browser which palette to use for form controls, scrollbars and
  // the area beyond the page, so nothing renders as a bright rectangle.
  root.style.colorScheme = resolved;
}

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
};

/**
 * Theme state.
 *
 * The class is already on `<html>` before React mounts (see the bootstrap
 * script in index.html); this provider keeps it in sync afterwards. The write
 * happens in a layout effect so a switch is committed before the browser
 * paints — with a passive effect the old palette shows for one frame.
 */
export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(defaultTheme));
  // Only the OS preference is state; what is on screen is derived from it, so
  // the two can never disagree.
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  const resolvedTheme: "dark" | "light" =
    theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  // Layout effect, so a theme change is committed to the DOM before the browser
  // paints; with a passive effect the old palette shows for one frame.
  useLayoutEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Follow the OS while the preference is "system".
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies.
    }
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
