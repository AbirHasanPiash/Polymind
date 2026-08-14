import { createContext, useContext } from "react";

export type ChatResetContextValue = {
  /** Increments each time the user asks for a fresh conversation. */
  resetKey: number;
  triggerReset: () => void;
};

export const ChatResetContext = createContext<ChatResetContextValue | null>(null);

export function useChatReset(): ChatResetContextValue {
  const context = useContext(ChatResetContext);
  if (!context) throw new Error("useChatReset must be used inside a ChatResetProvider");
  return context;
}
