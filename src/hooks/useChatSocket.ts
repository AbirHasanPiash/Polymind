import { useCallback, useEffect, useRef, useState } from "react";

import type { WsClientMessage, WsServerEvent } from "../api/types";
import { WS_URL } from "../lib/env";

export type SocketStatus = "connecting" | "open" | "reconnecting" | "closed" | "rejected";

/** 1008 = policy violation: bad token. Retrying cannot help. */
const WS_POLICY_VIOLATION = 1008;
const BASE_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;
const PING_INTERVAL_MS = 25_000;

type Options = {
  token: string | null;
  chatId: string | null;
  /**
   * Bump to force a brand new conversation.
   *
   * Needed because the socket may have adopted a server-assigned id that the
   * route never saw; without this, "New chat" would keep appending to the
   * conversation already in progress.
   */
  sessionKey?: number;
  onEvent: (event: WsServerEvent) => void;
  onClose?: (code: number) => void;
};

/**
 * Chat WebSocket lifecycle (protocol v2).
 *
 * - The token travels in the first frame, never in the URL.
 * - Reconnects back off exponentially and resume the adopted conversation.
 * - Models and effort travel with each message, so nothing reconnects when
 *   the user switches models.
 * - A heartbeat keeps proxies from closing an idle socket.
 */
export function useChatSocket({ token, chatId, sessionKey = 0, onEvent, onClose }: Options) {
  const [status, setStatus] = useState<SocketStatus>("closed");

  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The conversation this socket is attached to. Held in a ref so the id the
  // server assigns to a new conversation can be adopted without dropping the
  // live socket.
  const chatIdRef = useRef(chatId);

  const onEventRef = useRef(onEvent);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onEventRef.current = onEvent;
    onCloseRef.current = onClose;
  }, [onEvent, onClose]);

  useEffect(() => {
    chatIdRef.current = chatId;
    if (!token) return;

    let disposed = false;

    const clearTimers = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
    };

    const connect = () => {
      if (disposed) return;

      const params = new URLSearchParams();
      if (chatIdRef.current) params.set("chat_id", chatIdRef.current);
      const query = params.toString();

      const socket = new WebSocket(`${WS_URL}/api/v1/chat/ws${query ? `?${query}` : ""}`);
      socketRef.current = socket;
      setStatus(retryRef.current === 0 ? "connecting" : "reconnecting");

      socket.onopen = () => {
        if (disposed) {
          socket.close();
          return;
        }
        socket.send(JSON.stringify({ type: "auth", token }));
        retryRef.current = 0;
        setStatus("open");
        pingTimerRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ping" }));
        }, PING_INTERVAL_MS);
      };

      socket.onmessage = (event) => {
        if (disposed) return;

        let parsed: WsServerEvent;
        try {
          parsed = JSON.parse(event.data) as WsServerEvent;
        } catch {
          console.warn("Ignoring unparseable socket frame");
          return;
        }

        if (parsed.type === "pong") return;
        if (parsed.type === "system" && parsed.event === "chat_id") {
          chatIdRef.current = parsed.payload;
        }
        onEventRef.current(parsed);
      };

      socket.onclose = (event) => {
        if (disposed) return;
        socketRef.current = null;
        if (pingTimerRef.current) {
          clearInterval(pingTimerRef.current);
          pingTimerRef.current = null;
        }
        onCloseRef.current?.(event.code);

        if (event.code === WS_POLICY_VIOLATION) {
          setStatus("rejected");
          return;
        }

        const delay = Math.min(BASE_RETRY_MS * 2 ** retryRef.current, MAX_RETRY_MS);
        retryRef.current += 1;
        setStatus("reconnecting");
        retryTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimers();
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close(1000, "client navigating away");
      setStatus("closed");
    };
  }, [token, chatId, sessionKey]);

  const send = useCallback((message: WsClientMessage): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  /** Ask the server to stop generating; the socket stays open. */
  const stop = useCallback(() => send({ type: "stop" }), [send]);

  return { status, send, stop, isConnected: status === "open" };
}
