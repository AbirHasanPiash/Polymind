import { createContext, useContext } from "react";

/**
 * The top bar exposes one mounting point for page-specific actions (the chat
 * page puts its share, instructions and export controls there). Pages render
 * into it through `HeaderPortal`, so the layout owns the bar and pages never
 * have to draw a second one.
 */
export const HeaderSlotContext = createContext<HTMLElement | null>(null);

export function useHeaderSlot(): HTMLElement | null {
  return useContext(HeaderSlotContext);
}
