import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query.
 *
 * `useSyncExternalStore` reads the current match during the first render, so
 * the component paints the right layout immediately. Reading `window.innerWidth`
 * in an effect instead renders the desktop layout first and then snaps to
 * mobile — the layout jump that shows on every page load on a phone.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Tailwind's `lg` breakpoint: below this the dashboard uses the drawer layout. */
export const MOBILE_QUERY = "(max-width: 1023px)";

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
