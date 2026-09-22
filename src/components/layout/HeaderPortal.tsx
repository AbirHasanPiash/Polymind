import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useHeaderSlot } from "./header-slot";

/** Renders its children inside the top bar's action slot. */
export function HeaderPortal({ children }: { children: ReactNode }) {
  const slot = useHeaderSlot();
  if (!slot) return null;
  return createPortal(children, slot);
}
