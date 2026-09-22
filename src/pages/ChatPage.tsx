import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowDown } from "lucide-react";

import api, { getErrorMessage } from "../api/client";
import type { ApiMessage, ChatSummary, Effort, UploadedFileMeta, WsServerEvent, WsSlot } from "../api/types";
import { ChatActions } from "../components/chat/ChatActions";
import { Composer } from "../components/chat/Composer";
import { EmptyChat } from "../components/chat/EmptyChat";
import { MessageBubble, type BubbleActions } from "../components/chat/MessageBubble";
import { buildRows, type ModelSelection, type UIMessage } from "../components/chat/types";
import { SELECT_MODEL_EVENT } from "../components/layout/CommandPalette";
import { HeaderPortal } from "../components/layout/HeaderPortal";
import { useAuth } from "../context/auth-context";
import { useChatReset } from "../context/chat-reset-context";
import { useToast } from "../context/toast-context";
import { refreshChats } from "../hooks/useChats";
import { useChatSocket } from "../hooks/useChatSocket";
import { useModelCatalogue } from "../hooks/useModelCatalogue";
import { useReadAloud } from "../hooks/useReadAloud";
import { truncate } from "../lib/format";
import { AUTO_MODEL } from "../lib/models";
import { readJson, writeJson } from "../lib/storage";
import { cn } from "../lib/utils";

const AUTO_SCROLL_THRESHOLD_PX = 160;
const COPY_FEEDBACK_MS = 2000;
const SELECTION_KEY = "model-selection";

type ChatMeta = {
  id: string | null;
  title: string | null;
  mode: "chat" | "arena";
  pinned: boolean;
  systemPrompt: string | null;
  shareToken: string | null;
};

const EMPTY_META: ChatMeta = { id: null, title: null, mode: "chat", pinned: false, systemPrompt: null, shareToken: null };

function fromApi(message: ApiMessage): UIMessage {
  return {
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
    model: message.model,
    parentId: message.parent_id,
    attachments: message.attachments ?? [],
    cost: message.cost,
    promptTokens: message.prompt_tokens,
    completionTokens: message.completion_tokens,
    durationMs: message.duration_ms,
    status:
      message.finish_reason === "interrupted"
        ? "interrupted"
        : message.finish_reason === "length"
          ? "length"
          : message.finish_reason === "refusal"
            ? "refused"
            : "done",
    createdAt: message.created_at ? new Date(message.created_at).getTime() : undefined,
  };
}

export default function ChatPage() {
  const { token, user, setUser } = useAuth();
  const { chatId: routeChatId } = useParams();
  const [searchParams] = useSearchParams();
  const { resetKey } = useChatReset();
  const navigate = useNavigate();
  const toast = useToast();
  const { models, catalogue, byId } = useModelCatalogue();
  const readAloud = useReadAloud();
  const { play: playReadAloud, stop: stopReadAloud, activeId: readAloudId, state: readAloudState } = readAloud;

  const preferences = user?.preferences;
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [meta, setMeta] = useState<ChatMeta>(EMPTY_META);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [effort, setEffort] = useState<Effort>(() => preferences?.default_effort ?? "medium");
  const [selection, setSelection] = useState<ModelSelection>(() => {
    const stored = readJson<ModelSelection | null>(SELECTION_KEY, null);
    if (searchParams.get("arena")) return { mode: "arena", models: [] };
    return stored ?? { mode: "single", model: preferences?.default_model ?? AUTO_MODEL };
  });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<UIMessage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(Boolean(routeChatId));

  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const followOutput = useRef(true);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Streaming buffers: chunks land here and are flushed once per animation
  // frame. Calling setState per token re-rendered dozens of times a second.
  const pendingChunks = useRef(new Map<number, string[]>());
  const flushHandle = useRef<number | null>(null);
  const slotMessageIds = useRef(new Map<number, string>());
  const turnUserMessageId = useRef<string | null>(null);

  // A stale stored preference (a retired model) must not stick around. Checked
  // once per catalogue during render, the documented way to derive state from
  // a changed input without an extra effect render.
  const [validatedCatalogue, setValidatedCatalogue] = useState<typeof models | null>(null);
  if (models.length > 0 && models !== validatedCatalogue) {
    setValidatedCatalogue(models);
    if (selection.mode === "single" && selection.model !== AUTO_MODEL && !byId.has(selection.model)) {
      setSelection({ mode: "single", model: AUTO_MODEL });
    } else if (selection.mode === "arena") {
      const valid = selection.models.filter((id) => byId.has(id));
      if (valid.length !== selection.models.length) setSelection({ mode: "arena", models: valid });
    }
  }

  useEffect(() => {
    writeJson(SELECTION_KEY, selection);
  }, [selection]);

  useEffect(() => {
    const onSelect = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      setSelection((current) => (current.mode === "arena" ? current : { mode: "single", model: id }));
      textareaRef.current?.focus();
    };
    window.addEventListener(SELECT_MODEL_EVENT, onSelect);
    return () => window.removeEventListener(SELECT_MODEL_EVENT, onSelect);
  }, []);

  /* ---------------------------------------------------------------- scroll */

  const scrollToBottom = useCallback((smooth = false) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    followOutput.current = true;
    setShowScrollButton(false);
  }, []);

  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    const atBottom = distance < AUTO_SCROLL_THRESHOLD_PX;
    followOutput.current = atBottom;
    setShowScrollButton((current) => (current === !atBottom ? current : !atBottom));
  }, []);

  /* -------------------------------------------------------------- streaming */

  const flushChunks = useCallback(() => {
    flushHandle.current = null;
    const pending = pendingChunks.current;
    if (pending.size === 0) return;
    const updates = new Map<string, string>();
    for (const [slot, chunks] of pending) {
      const id = slotMessageIds.current.get(slot);
      if (id && chunks.length) updates.set(id, chunks.join(""));
    }
    pending.clear();
    if (updates.size === 0) return;

    setMessages((current) =>
      current.map((message) => {
        const extra = updates.get(message.id);
        return extra ? { ...message, content: message.content + extra } : message;
      }),
    );

    if (followOutput.current) {
      requestAnimationFrame(() => {
        const scroller = scrollerRef.current;
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
      });
    }
  }, []);

  const queueChunk = useCallback(
    (slot: number, delta: string) => {
      const list = pendingChunks.current.get(slot) ?? [];
      list.push(delta);
      pendingChunks.current.set(slot, list);
      if (flushHandle.current === null) flushHandle.current = requestAnimationFrame(flushChunks);
    },
    [flushChunks],
  );

  const settle = useCallback(() => {
    if (flushHandle.current !== null) {
      cancelAnimationFrame(flushHandle.current);
      flushHandle.current = null;
    }
    flushChunks();
  }, [flushChunks]);

  useEffect(
    () => () => {
      if (flushHandle.current !== null) cancelAnimationFrame(flushHandle.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  /* ----------------------------------------------------------------- socket */

  const appendSystemMessage = useCallback((content: string) => {
    setMessages((current) => [...current, { id: `local-sys-${Date.now()}`, role: "system", content }]);
  }, []);

  const handleSocketEvent = useCallback(
    (event: WsServerEvent) => {
      switch (event.type) {
        case "system":
          if (event.event === "chat_id") {
            // Updated directly rather than through the router: a router
            // navigation would change this component's chatId param, which
            // reconnects the socket and cuts off the reply currently streaming.
            window.history.replaceState(null, "", `/dashboard/chat/${event.payload}`);
            setMeta((current) => ({ ...current, id: event.payload }));
            void refreshChats();
          } else if (event.event === "title") {
            setMeta((current) => ({ ...current, title: event.payload }));
            void refreshChats();
          } else if (event.event === "ready") {
            if (event.payload.chat_id) setMeta((current) => ({ ...current, id: event.payload.chat_id, mode: event.payload.mode }));
          }
          break;

        case "turn_start": {
          settle();
          turnUserMessageId.current = event.user_message_id;
          slotMessageIds.current.clear();
          const placeholders: UIMessage[] = event.slots.map((slot: WsSlot) => {
            const id = `local-${event.user_message_id}-${slot.slot}`;
            slotMessageIds.current.set(slot.slot, id);
            return {
              id,
              role: "assistant",
              content: "",
              model: slot.model,
              slot: slot.slot,
              parentId: event.user_message_id,
              status: "streaming",
              intent: slot.intent,
              reason: slot.reason,
            };
          });
          setMessages((current) => {
            // Bind the optimistic user message to its server id.
            const bound = current.map((m) => (m.id.startsWith("local-user-") ? { ...m, id: event.user_message_id } : m));
            return [...bound, ...placeholders];
          });
          followOutput.current = true;
          requestAnimationFrame(() => scrollToBottom());
          break;
        }

        case "content":
          queueChunk(event.slot, event.delta);
          break;

        case "message_done": {
          settle();
          const localId = slotMessageIds.current.get(event.slot);
          setMessages((current) =>
            current.map((message) =>
              message.id === localId
                ? {
                    ...message,
                    id: event.message_id ?? message.id,
                    model: event.model,
                    servedModel: event.served_model,
                    status:
                      event.finish_reason === "interrupted"
                        ? "interrupted"
                        : event.finish_reason === "length"
                          ? "length"
                          : event.finish_reason === "refusal"
                            ? "refused"
                            : "done",
                    cost: event.cost,
                    promptTokens: event.prompt_tokens,
                    completionTokens: event.completion_tokens,
                    durationMs: event.duration_ms,
                    notes: event.notes,
                  }
                : message,
            ),
          );
          break;
        }

        case "turn_done":
          settle();
          setBusy(false);
          setMessages((current) => current.filter((m) => !(m.status === "streaming" && !m.content)).map((m) => (m.status === "streaming" ? { ...m, status: "done" } : m)));
          setUser((current) => (current?.wallet ? { ...current, wallet: { ...current.wallet, credits: event.balance } } : current));
          void refreshChats();
          break;

        case "error": {
          settle();
          const localId = event.slot !== null ? slotMessageIds.current.get(event.slot) : undefined;
          if (localId) {
            setMessages((current) =>
              current.map((message) => (message.id === localId ? { ...message, status: event.code === "refused" ? "refused" : "error", notes: [event.message] } : message)),
            );
          } else {
            setBusy(false);
            appendSystemMessage(event.message);
          }
          if (event.code === "insufficient_credits") {
            setBusy(false);
            toast.error(event.message);
          }
          break;
        }
      }
    },
    [appendSystemMessage, queueChunk, scrollToBottom, setUser, settle, toast],
  );

  const handleSocketClose = useCallback(
    (code: number) => {
      settle();
      setBusy(false);
      if (code === 1008) appendSystemMessage("Disconnected: your session ended. Sign in again to continue.");
    },
    [appendSystemMessage, settle],
  );

  const { send, stop, isConnected } = useChatSocket({
    token,
    chatId: routeChatId ?? null,
    sessionKey: resetKey,
    onEvent: handleSocketEvent,
    onClose: handleSocketClose,
  });

  /* ---------------------------------------------------------------- history */

  // Switching conversations resets the transcript synchronously (during
  // render), then the effect below loads the new history.
  const [loadedFor, setLoadedFor] = useState(routeChatId);
  if (routeChatId !== loadedFor) {
    setLoadedFor(routeChatId);
    setMessages([]);
    setMeta(EMPTY_META);
    setEditing(null);
    setLoadingHistory(Boolean(routeChatId));
  }

  useEffect(() => {
    if (!routeChatId) return;

    let cancelled = false;
    (async () => {
      try {
        const [{ data: history }, { data: chat }] = await Promise.all([
          api.get<ApiMessage[]>(`/chat/history/${routeChatId}`),
          api.get<ChatSummary>(`/chat/${routeChatId}`),
        ]);
        if (cancelled) return;
        setMessages(history.map(fromApi));
        setMeta({
          id: chat.id,
          title: chat.title,
          mode: chat.mode,
          pinned: chat.pinned,
          systemPrompt: chat.system_prompt,
          shareToken: chat.share_token,
        });
        if (chat.mode === "arena") {
          const lastModels = [...new Set(history.filter((m) => m.role === "ai" && m.model).map((m) => m.model as string))].slice(-3);
          setSelection((current) => (current.mode === "arena" && current.models.length >= 2 ? current : { mode: "arena", models: lastModels }));
        } else {
          setSelection((current) => (current.mode === "arena" ? { mode: "single", model: AUTO_MODEL } : current));
        }
        requestAnimationFrame(() => scrollToBottom());
      } catch (error) {
        if (cancelled) return;
        toast.error(getErrorMessage(error, "Could not load this conversation"));
        navigate("/dashboard", { replace: true });
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // The effect must run for a change of conversation only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeChatId]);

  // "New chat" from the sidebar or the command palette: state resets happen
  // during render; the navigation side effects run in the effect below.
  const [seenResetKey, setSeenResetKey] = useState(resetKey);
  if (resetKey !== seenResetKey) {
    setSeenResetKey(resetKey);
    setMessages([]);
    setMeta(EMPTY_META);
    setInput("");
    setFiles([]);
    setEditing(null);
    setBusy(false);
    if (searchParams.get("arena")) setSelection({ mode: "arena", models: [] });
    else setSelection((current) => (current.mode === "arena" ? { mode: "single", model: preferences?.default_model ?? AUTO_MODEL } : current));
  }
  const previousResetKey = useRef(resetKey);
  useEffect(() => {
    if (resetKey === previousResetKey.current) return;
    previousResetKey.current = resetKey;
    stopReadAloud();
    if (window.location.pathname !== "/dashboard") window.history.replaceState(null, "", "/dashboard");
    if (routeChatId) navigate("/dashboard", { replace: true });
  }, [resetKey, routeChatId, navigate, stopReadAloud]);

  /* -------------------------------------------------------------------- send */

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if ((!text && files.length === 0) || busy) return;
    if (!isConnected) {
      toast.error("Still connecting to the chat service. Please try again in a moment.");
      return;
    }
    if (selection.mode === "arena" && selection.models.length < 2) {
      toast.error("Pick at least two models to compare.");
      return;
    }

    setBusy(true);
    followOutput.current = true;

    let uploaded: UploadedFileMeta[] = [];
    if (files.length > 0) {
      try {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        const { data } = await api.post<{ files: UploadedFileMeta[] }>("/chat/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploaded = data.files.filter((file) => file.id);
        const failed = data.files.filter((file) => !file.id);
        if (failed.length > 0) toast.error(`Could not process ${failed.length} file(s): ${failed[0]?.error ?? ""}`);
        if (uploaded.length === 0 && !text) {
          setBusy(false);
          return;
        }
      } catch (error) {
        setBusy(false);
        toast.error(getErrorMessage(error, "Failed to upload attachments"));
        return;
      }
    }

    const optimistic: UIMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: text,
      attachments: files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      createdAt: Date.now(),
    };
    setMessages((current) => {
      if (editing) {
        const index = current.findIndex((m) => m.id === editing.id);
        return [...(index >= 0 ? current.slice(0, index) : current), optimistic];
      }
      return [...current, optimistic];
    });
    // A brand new chat gets a provisional title from the prompt; the server
    // replaces it with a generated one once the first reply lands.
    setMeta((current) =>
      current.id === null && !current.title
        ? { ...current, title: text ? truncate(text.replace(/\s+/g, " "), 48) : files[0]?.name ?? "New chat", mode: selection.mode === "arena" ? "arena" : "chat" }
        : current,
    );
    requestAnimationFrame(() => scrollToBottom());

    const sent = send({
      type: "user_message",
      content: text,
      attachments: uploaded.map((file) => ({ id: file.id as string })),
      ...(selection.mode === "arena" ? { models: selection.models } : { model: selection.model }),
      effort,
      ...(editing ? { edit_message_id: editing.id } : {}),
    });

    if (!sent) {
      setBusy(false);
      toast.error("Connection lost. Your message was not sent.");
      return;
    }
    setInput("");
    setFiles([]);
    setEditing(null);
  }, [input, files, busy, isConnected, selection, effort, editing, send, scrollToBottom, toast]);

  const regenerate = useCallback(() => {
    if (busy || !isConnected) return;
    setBusy(true);
    setMessages((current) => {
      const lastUser = [...current].reverse().find((m) => m.role === "user");
      if (!lastUser) return current;
      const index = current.indexOf(lastUser);
      return current.slice(0, index + 1);
    });
    send({
      type: "regenerate",
      ...(selection.mode === "arena" ? { models: selection.models } : { model: selection.model }),
      effort,
    });
  }, [busy, isConnected, selection, effort, send]);

  const startEdit = useCallback((message: UIMessage) => {
    setEditing(message);
    setInput(message.content);
    textareaRef.current?.focus();
  }, []);

  const handleStop = useCallback(() => {
    if (!busy) return;
    stop();
  }, [busy, stop]);

  const handleCopy = useCallback(
    async (text: string, id: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopiedId(null), COPY_FEEDBACK_MS);
      } catch {
        toast.error("Your browser blocked clipboard access");
      }
    },
    [toast],
  );

  const updateMeta = useCallback(
    async (patch: Partial<ChatSummary>) => {
      if (!meta.id) return;
      const { share_token, ...body } = patch;
      if (Object.keys(body).length > 0) await api.patch(`/chat/${meta.id}`, body);
      setMeta((current) => ({
        ...current,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
        ...(patch.system_prompt !== undefined ? { systemPrompt: patch.system_prompt } : {}),
        ...(share_token !== undefined ? { shareToken: share_token } : {}),
      }));
      void refreshChats();
    },
    [meta.id],
  );

  // The browser tab carries the conversation title, since the page itself no longer does.
  useEffect(() => {
    document.title = meta.title ? `${meta.title} · Polymind` : "Chat · Polymind";
  }, [meta.title]);

  // Typing anywhere focuses the composer.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.key.length !== 1) return;
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || (document.activeElement as HTMLElement | null)?.isContentEditable) return;
      textareaRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ------------------------------------------------------------------ render */

  const rows = useMemo(() => buildRows(messages), [messages]);
  const lastAssistantId = useMemo(() => [...messages].reverse().find((m) => m.role === "assistant")?.id, [messages]);
  const isEmpty = messages.length === 0 && !loadingHistory;
  const arena = meta.mode === "arena" || selection.mode === "arena";
  const showCosts = preferences?.show_costs ?? true;

  const actions: BubbleActions = useMemo(
    () => ({
      onCopy: handleCopy,
      onRegenerate: busy ? undefined : () => regenerate(),
      onEdit: busy ? undefined : startEdit,
      onReadAloud: (message) => void playReadAloud(message.id),
      readAloudState: { id: readAloudId, state: readAloudState },
    }),
    [handleCopy, busy, regenerate, startEdit, playReadAloud, readAloudId, readAloudState],
  );

  return (
    <div className="relative flex h-full flex-col bg-canvas">
      <HeaderPortal>
        <ChatActions
          chatId={meta.id}
          title={meta.title}
          mode={meta.mode}
          pinned={meta.pinned}
          systemPrompt={meta.systemPrompt}
          shareToken={meta.shareToken}
          connected={isConnected}
          onUpdate={updateMeta}
        />
      </HeaderPortal>

      <div ref={scrollerRef} onScroll={handleScroll} className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {isEmpty ? (
          <EmptyChat
            name={user?.full_name}
            arena={arena}
            onPick={(prompt) => {
              setInput(prompt);
              textareaRef.current?.focus();
            }}
            onCompare={() => {
              const first = models[0]?.id;
              const second = models.find((m) => m.provider !== models[0]?.provider)?.id;
              setSelection({ mode: "arena", models: [first, second].filter((m): m is string => Boolean(m)) });
            }}
          />
        ) : (
          <div className={cn("mx-auto space-y-5", arena ? "max-w-6xl" : "max-w-3xl")}>
            {loadingHistory && (
              <div className="space-y-4 py-6">
                <div className="ml-auto h-10 w-2/5 animate-shimmer rounded-2xl" />
                <div className="h-24 w-4/5 animate-shimmer rounded-2xl" />
              </div>
            )}
            {rows.map((row) => {
              if (row.kind === "user" || row.kind === "system") {
                return (
                  <MessageBubble
                    key={row.message.id}
                    message={row.message}
                    models={models}
                    isCopied={copiedId === row.message.id}
                    showCosts={showCosts}
                    isLast={false}
                    actions={actions}
                  />
                );
              }
              if (row.messages.length === 1) {
                const message = row.messages[0];
                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    models={models}
                    isCopied={copiedId === message.id}
                    showCosts={showCosts}
                    isLast={message.id === lastAssistantId}
                    actions={actions}
                  />
                );
              }
              return (
                <div key={row.key} className="grid gap-3 md:grid-cols-2 xl:auto-cols-fr xl:grid-flow-col">
                  {row.messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      models={models}
                      isCopied={copiedId === message.id}
                      showCosts={showCosts}
                      isLast={row.messages.some((m) => m.id === lastAssistantId)}
                      actions={actions}
                      column
                    />
                  ))}
                </div>
              );
            })}
            <div className="h-2" />
          </div>
        )}
      </div>

      {showScrollButton && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="surface-pop absolute right-4 bottom-32 z-20 rounded-full p-2.5 text-fg-muted animate-scale-in hover:text-fg sm:right-8"
          aria-label="Scroll to latest message"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {editing && (
        <div className="mx-auto -mb-1 flex w-full max-w-3xl items-center justify-between px-4 text-xs text-fg-muted">
          <span>Editing a message — sending will replace it and everything after it.</span>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setInput("");
            }}
            className="font-medium text-accent hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      <Composer
        value={input}
        onChange={setInput}
        files={files}
        onFilesChange={setFiles}
        selection={selection}
        onSelectionChange={setSelection}
        effort={effort}
        onEffortChange={setEffort}
        effortLevels={catalogue.effort_levels}
        busy={busy}
        connected={isConnected}
        onSend={() => void sendMessage()}
        onStop={handleStop}
        textareaRef={textareaRef}
        savedPrompts={preferences?.saved_prompts ?? []}
        sendOnEnter={preferences?.send_on_enter ?? true}
        lockMode={meta.id ? meta.mode : null}
      />
    </div>
  );
}
