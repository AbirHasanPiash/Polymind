import { useEffect } from "react";

type Handler = (event: KeyboardEvent) => void;

/**
 * Global keyboard shortcut. `combo` is like "mod+k" (mod = ⌘ on macOS, Ctrl elsewhere).
 * Ignores keystrokes inside inputs unless `allowInInputs` is set.
 */
export function useHotkey(combo: string, handler: Handler, options: { allowInInputs?: boolean; enabled?: boolean } = {}) {
  const { allowInInputs = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split("+");
    const key = parts[parts.length - 1];
    const needsMod = parts.includes("mod");
    const needsShift = parts.includes("shift");
    const needsAlt = parts.includes("alt");

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (needsMod !== mod || needsShift !== event.shiftKey || needsAlt !== event.altKey) return;
      if (event.key.toLowerCase() !== key) return;
      if (!allowInInputs) {
        const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
        const editable = (event.target as HTMLElement | null)?.isContentEditable;
        if (!needsMod && (tag === "input" || tag === "textarea" || tag === "select" || editable)) return;
      }
      handler(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [combo, handler, allowInInputs, enabled]);
}

export const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const MOD_KEY = IS_MAC ? "⌘" : "Ctrl";
