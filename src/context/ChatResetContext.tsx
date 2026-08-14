import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ChatResetContext } from "./chat-reset-context";

/**
 * Signals "start a new conversation" from the sidebar to the chat page.
 *
 * The value is memoised: an object literal recreated on every render would
 * re-render every consumer of this context for no reason.
 */
export function ChatResetProvider({ children }: { children: ReactNode }) {
  const [resetKey, setResetKey] = useState(0);

  const triggerReset = useCallback(() => setResetKey((key) => key + 1), []);

  const value = useMemo(() => ({ resetKey, triggerReset }), [resetKey, triggerReset]);

  return <ChatResetContext.Provider value={value}>{children}</ChatResetContext.Provider>;
}
