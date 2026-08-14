import { useCallback, useEffect, useRef, useState } from "react";

import { WS_URL } from "../lib/env";

/** Events the server can push down the socket. */
export type ChatSocketEvent =
  | { type: "content"; delta: string }
  | { type: "system"; event: "chat_id" | "route" | "cost" | "warning"; payload: string }
  | { type: "error"; message: string };

export type OutgoingMessage = {
  type: "user_message";
  content: string;
  attachments: { id: string }[];
  /** Overrides the connection default for this turn only. */
  model?: string;
};

export type SocketStatus = "connecting" | "open" | "reconnecting" | "closed" | "rejected";

/** 1008 = policy violation: bad token or no credits. Retrying cannot help. */
const WS_POLICY_VIOLATION = 1008;
const BASE_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

type Options = {
  token: string | null;
  /** Model used when a message does not specify one. */
  model: string;
  chatId: string | null;
  /**
   * Bump to force a brand new conversation.
   *
   * Needed because the socket may have adopted a server-assigned id that the
   * route never saw; without this, "New chat" would keep appending to the
   * conversation already in progress.
   */
  sessionKey?: number;
  onEvent: (event: ChatSocketEvent) => void;
  onClose?: (code: number) => void;
};

/**
 * Chat WebSocket lifecycle.
 *
 * Three things this fixes over the inline version it replaces:
 *  - the endpoint comes from configuration instead of a hard-coded hostname;
 *  - reconnects back off exponentially rather than hammering a down server
 *    every three seconds forever;
 *  - changing the model no longer tears down the connection, because the model
 *    now travels with each message.
 */
export function useChatSocket({
  token,
  model,
  chatId,
  sessionKey = 0,
  onEvent,
  onClose,
}: Options) {
  const [status, setStatus] = useState<SocketStatus>("closed");

  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The conversation this socket is attached to. Held in a ref rather than read
  // from the prop at connect time, so the id the server assigns to a new
  // conversation can be adopted (see onmessage) without dropping the live
  // socket — reconnecting there would cut off the reply being streamed.
  const chatIdRef = useRef(chatId);

  // Handlers live in refs so a new callback identity never reconnects the
  // socket. They are written in an effect rather than during render, because a
  // ref mutation during render is not safe under concurrent rendering.
  const onEventRef = useRef(onEvent);
  const onCloseRef = useRef(onClose);
  const modelRef = useRef(model);

  useEffect(() => {
    onEventRef.current = onEvent;
    onCloseRef.current = onClose;
    modelRef.current = model;
  }, [onEvent, onClose, model]);

  useEffect(() => {
    // A change to `chatId` (the user opened another conversation) or to
    // `sessionKey` (the user asked for a new one) does need a fresh connection,
    // and resets whichever id the socket had adopted.
    chatIdRef.current = chatId;

    // Without a token there is nothing to connect; status stays "closed", which
    // the previous cleanup (or the initial state) already set.
    if (!token) return;

    let disposed = false;

    const clearRetry = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const connect = () => {
      if (disposed) return;

      const params = new URLSearchParams({ token, model: modelRef.current });
      if (chatIdRef.current) params.set("chat_id", chatIdRef.current);

      const socket = new WebSocket(`${WS_URL}/api/v1/chat/ws?${params.toString()}`);
      socketRef.current = socket;
      setStatus(retryRef.current === 0 ? "connecting" : "reconnecting");

      socket.onopen = () => {
        if (disposed) {
          socket.close();
          return;
        }
        retryRef.current = 0;
        setStatus("open");
      };

      socket.onmessage = (event) => {
        if (disposed) return;

        let parsed: ChatSocketEvent;
        try {
          parsed = JSON.parse(event.data) as ChatSocketEvent;
        } catch {
          console.warn("Ignoring unparseable socket frame");
          return;
        }

        // Adopt the id the server assigns to a brand new conversation. Doing it
        // here (rather than reconnecting with it) keeps the reply that is
        // currently streaming alive, while making sure a later reconnect
        // resumes this conversation instead of starting another one.
        if (parsed.type === "system" && parsed.event === "chat_id") {
          chatIdRef.current = parsed.payload;
        }

        onEventRef.current(parsed);
      };

      socket.onclose = (event) => {
        if (disposed) return;
        socketRef.current = null;
        onCloseRef.current?.(event.code);

        if (event.code === WS_POLICY_VIOLATION) {
          setStatus("rejected");
          return;
        }

        // Exponential backoff, capped. A fixed short delay turns a backend
        // restart into a request storm from every open tab.
        const delay = Math.min(BASE_RETRY_MS * 2 ** retryRef.current, MAX_RETRY_MS);
        retryRef.current += 1;
        setStatus("reconnecting");
        retryTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      clearRetry();
      const socket = socketRef.current;
      socketRef.current = null;
      // 1000 = normal closure, so the server does not treat this as an error.
      socket?.close(1000, "client navigating away");
      setStatus("closed");
    };
  }, [token, chatId, sessionKey]);

  const send = useCallback((message: OutgoingMessage): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  /** Ends the current generation; the backend stops billing at what it produced. */
  const interrupt = useCallback(() => {
    socketRef.current?.close(1000, "user stopped generation");
  }, []);

  return { status, send, interrupt, isConnected: status === "open" };
}
