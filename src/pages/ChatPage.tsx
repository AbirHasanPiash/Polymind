import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDownIcon, CpuChipIcon, XMarkIcon } from "@heroicons/react/24/solid";

import api, { getErrorMessage } from "../api/client";
import ChatInput from "../components/ChatInput";
import ModelSelector from "../components/ModelSelector";
import { MessageBubble } from "../components/chat/MessageBubble";
import type { ChatMessage, UploadedFileMeta } from "../components/chat/types";
import { useAuth } from "../context/auth-context";
import { useChatReset } from "../context/chat-reset-context";
import { useToast } from "../context/toast-context";
import { useChatSocket, type ChatSocketEvent } from "../hooks/useChatSocket";

/** Distance from the bottom within which the view keeps following new output. */
const AUTO_SCROLL_THRESHOLD_PX = 200;
const COPY_FEEDBACK_MS = 2000;

type HistoryMessage = {
  id: string;
  role: ChatMessage["role"];
  content: string;
  model?: string | null;
  created_at?: string;
  attachments?: ChatMessage["attachments"];
};

export default function ChatPage() {
  const { token, refreshProfile } = useAuth();
  const { chatId: routeChatId } = useParams();
  const { resetKey } = useChatReset();
  const navigate = useNavigate();
  const toast = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [model, setModel] = useState(() => sessionStorage.getItem("selectedModel") || "auto");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState("Thinking…");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSelectorOpen, setSelectorOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const followOutput = useRef(true);
  const activeModelRef = useRef<string | null>(null);

  // Streaming buffer: chunks land here and are flushed once per animation
  // frame. Calling setState per token re-rendered dozens of times a second,
  // which is what made long answers stutter.
  const pendingChunks = useRef<string[]>([]);
  const flushHandle = useRef<number | null>(null);
  const streamingMessageId = useRef<string | null>(null);

  useEffect(() => {
    sessionStorage.setItem("selectedModel", model);
  }, [model]);

  /* ----------------------------------------------------------------- scroll */

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
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    const atBottom = distanceFromBottom < AUTO_SCROLL_THRESHOLD_PX;
    followOutput.current = atBottom;
    setShowScrollButton((current) => (current === !atBottom ? current : !atBottom));
  }, []);

  /* --------------------------------------------------------------- streaming */

  const flushChunks = useCallback(() => {
    flushHandle.current = null;
    const chunks = pendingChunks.current;
    if (chunks.length === 0) return;

    const text = chunks.join("");
    pendingChunks.current = [];

    setMessages((current) => {
      const id = streamingMessageId.current;
      const last = current[current.length - 1];

      if (id && last?.id === id) {
        // Only the final element changes, so every earlier bubble keeps its
        // identity and `memo` skips re-rendering it.
        return [...current.slice(0, -1), { ...last, content: last.content + text }];
      }

      const newId = `ai-${Date.now()}`;
      streamingMessageId.current = newId;
      return [...current, { id: newId, role: "ai", content: text, model: activeModelRef.current }];
    });

    if (followOutput.current) {
      requestAnimationFrame(() => {
        const scroller = scrollerRef.current;
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
      });
    }
  }, []);

  const queueChunk = useCallback(
    (delta: string) => {
      pendingChunks.current.push(delta);
      if (flushHandle.current === null) {
        flushHandle.current = requestAnimationFrame(flushChunks);
      }
    },
    [flushChunks],
  );

  const endStream = useCallback(() => {
    if (flushHandle.current !== null) {
      cancelAnimationFrame(flushHandle.current);
      flushHandle.current = null;
    }
    flushChunks();
    streamingMessageId.current = null;
    activeModelRef.current = null;
    setIsStreaming(false);
    setIsThinking(false);
  }, [flushChunks]);

  useEffect(
    () => () => {
      if (flushHandle.current !== null) cancelAnimationFrame(flushHandle.current);
    },
    [],
  );

  /* ------------------------------------------------------------------ socket */

  const appendSystemMessage = useCallback((content: string) => {
    setMessages((current) => [...current, { id: `sys-${Date.now()}`, role: "system", content }]);
  }, []);

  const handleSocketEvent = useCallback(
    (event: ChatSocketEvent) => {
      switch (event.type) {
        case "content":
          setIsThinking(false);
          setIsStreaming(true);
          queueChunk(event.delta);
          break;

        case "system":
          if (event.event === "chat_id") {
            // The URL is updated directly rather than through the router: a
            // router navigation would change this component's chatId param,
            // which reconnects the socket and cuts off the reply currently
            // streaming. replaceState keeps the address bar shareable and
            // refresh-safe without touching the live connection.
            window.history.replaceState(null, "", `/dashboard/chat/${event.payload}`);
          } else if (event.event === "route") {
            activeModelRef.current = event.payload;
          } else if (event.event === "cost") {
            endStream();
            void refreshProfile();
          } else if (event.event === "warning") {
            appendSystemMessage(`⚠️ ${event.payload}`);
          }
          break;

        case "error":
          endStream();
          appendSystemMessage(`⚠️ ${event.message}`);
          break;
      }
    },
    [appendSystemMessage, endStream, queueChunk, refreshProfile],
  );

  const handleSocketClose = useCallback(
    (code: number) => {
      endStream();
      if (code === 1008) {
        appendSystemMessage("⚠️ Disconnected: your session ended or you are out of credits.");
      }
    },
    [appendSystemMessage, endStream],
  );

  const { send, interrupt, isConnected } = useChatSocket({
    token,
    model,
    chatId: routeChatId ?? null,
    sessionKey: resetKey,
    onEvent: handleSocketEvent,
    onClose: handleSocketClose,
  });

  /* ----------------------------------------------------------------- history */

  useEffect(() => {
    if (!routeChatId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<HistoryMessage[]>(`/chat/history/${routeChatId}`);
        if (cancelled) return;
        setMessages(
          data.map((message, index) => ({
            id: message.id || `history-${index}`,
            role: message.role,
            content: message.content,
            model: message.model,
            attachments: message.attachments ?? [],
            createdAt: message.created_at ? new Date(message.created_at).getTime() : undefined,
          })),
        );
        requestAnimationFrame(() => scrollToBottom());
      } catch (error) {
        if (cancelled) return;
        toast.error(getErrorMessage(error, "Could not load this conversation"));
        navigate("/dashboard", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
    // `toast` is stable (memoised in its provider) and intentionally not a dep
    // driver here; the effect must run for a change of conversation only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeChatId]);

  // "New AI Chat" in the sidebar.
  const previousResetKey = useRef(resetKey);
  useEffect(() => {
    if (resetKey === previousResetKey.current) return;
    previousResetKey.current = resetKey;

    setMessages([]);
    setInput("");
    setSelectedFiles([]);
    endStream();

    // The address bar can point at a conversation the router never navigated to
    // (the id was adopted mid-session), so both are reset.
    if (window.location.pathname !== "/dashboard") {
      window.history.replaceState(null, "", "/dashboard");
    }
    if (routeChatId) navigate("/dashboard", { replace: true });
  }, [resetKey, routeChatId, navigate, endStream]);

  /* -------------------------------------------------------------------- send */

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if ((!text && selectedFiles.length === 0) || isStreaming || isThinking) return;

    if (!isConnected) {
      toast.error("Still connecting to the chat service. Please try again in a moment.");
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: input,
        attachments: selectedFiles.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      },
    ]);

    setThinkingLabel(selectedFiles.length > 0 ? "Uploading and analysing…" : "Thinking…");
    setIsThinking(true);
    followOutput.current = true;
    requestAnimationFrame(() => scrollToBottom());

    let uploaded: UploadedFileMeta[] = [];
    if (selectedFiles.length > 0) {
      try {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("files", file));
        const { data } = await api.post<{ files: UploadedFileMeta[] }>("/chat/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        uploaded = data.files.filter((file) => file.id);
        const failed = data.files.filter((file) => !file.id);
        if (failed.length > 0) {
          toast.error(`Could not process ${failed.length} file(s): ${failed[0]?.error ?? ""}`);
        }
        if (uploaded.length === 0) {
          setIsThinking(false);
          return;
        }
      } catch (error) {
        setIsThinking(false);
        toast.error(getErrorMessage(error, "Failed to upload attachments"));
        return;
      }
    }

    const sent = send({
      type: "user_message",
      content: input,
      attachments: uploaded.map((file) => ({ id: file.id })),
      // Sent per message, so switching models never reconnects the socket.
      model,
    });

    if (!sent) {
      setIsThinking(false);
      toast.error("Connection lost. Your message was not sent.");
      return;
    }

    setInput("");
    setSelectedFiles([]);
  }, [
    input,
    isConnected,
    isStreaming,
    isThinking,
    model,
    scrollToBottom,
    selectedFiles,
    send,
    toast,
  ]);

  const handleStop = useCallback(() => {
    if (!isStreaming && !isThinking) return;
    endStream();
    // Closing the socket tells the server to stop generating; the hook
    // reconnects on its own.
    interrupt();
  }, [endStream, interrupt, isStreaming, isThinking]);

  /* ------------------------------------------------------------------- copy */

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

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

  /* -------------------------------------------------------- model selector UI */

  useEffect(() => {
    if (!isSelectorOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setSelectorOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectorOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isSelectorOpen]);

  // Typing anywhere focuses the composer.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.key.length !== 1) return;
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      textareaRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isEmpty = messages.length === 0;
  const bubbles = useMemo(
    () =>
      messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isCopied={copiedId === message.id}
          onCopy={handleCopy}
        />
      )),
    [messages, copiedId, handleCopy],
  );

  return (
    <div className="relative flex h-full flex-col app-surface dark:bg-gradient-to-br dark:from-[#0a0b0f] dark:via-[#0d0e14] dark:to-[#0a0b0f]">
      {/* Ambient glow. pointer-events-none so it can never swallow a click. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-purple-600/5 blur-3xl" />
      </div>

      {/* Model selector */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-4 py-3 sm:px-5">
        <div className="pointer-events-auto relative" ref={selectorRef}>
          {isSelectorOpen ? (
            <div className="animate-scale-in origin-top-right">
              <div className="relative w-[264px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-[#13151c]/95">
                <button
                  type="button"
                  onClick={() => setSelectorOpen(false)}
                  className="absolute top-2.5 right-2.5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-gray-500 dark:hover:bg-gray-700/50"
                  aria-label="Close model selector"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
                <p className="mb-2.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-gray-500">
                  Select model
                </p>
                <ModelSelector model={model} setModel={setModel} />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSelectorOpen(true)}
              className="group flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-xl hover:shadow-md dark:border-gray-700/50 dark:bg-[#1a1d25]/80"
              aria-label="Change model"
            >
              <CpuChipIcon className="h-4 w-4 text-slate-500 group-hover:text-blue-500 dark:text-gray-400 dark:group-hover:text-blue-400" />
              <span className="hidden max-w-[12ch] truncate text-xs font-medium text-slate-600 sm:inline dark:text-gray-300">
                {model === "auto" ? "Auto" : model}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="custom-scrollbar flex-1 overflow-y-auto px-3 pt-16 pb-4 sm:px-4 sm:pt-20 md:px-6"
      >
        <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
          {isEmpty && (
            <div className="flex h-[60vh] flex-col items-center justify-center px-4 text-center animate-fade-in">
              <div className="relative mb-8">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-20 blur-3xl" />
                <div className="relative flex h-20 w-20 rotate-6 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 shadow-2xl transition-transform duration-500 hover:rotate-0 sm:h-24 sm:w-24">
                  <svg
                    className="h-10 w-10 text-white sm:h-12 sm:w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
                Ready to assist
              </h2>
              <p className="max-w-md text-base text-slate-500 sm:text-lg dark:text-gray-400">
                Ask questions, write code, analyse data, or explore ideas together
              </p>
            </div>
          )}

          {bubbles}

          {isThinking && (
            <div className="flex items-start gap-3 pl-2 animate-fade-in sm:gap-4 sm:pl-3">
              <div className="relative mt-0.5 h-8 w-8 shrink-0 sm:h-9 sm:w-9">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500/70 border-r-purple-500/30" />
                <div className="absolute inset-2 flex items-center justify-center rounded-full bg-white dark:bg-[#0d0e14]">
                  <div className="h-2 w-2 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
                </div>
              </div>
              <div className="inline-flex items-center gap-2.5 rounded-2xl rounded-bl-sm border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm dark:border-gray-700/30 dark:bg-[#13151c]">
                <span className="text-xs font-medium text-slate-600 sm:text-sm dark:text-gray-300">
                  {thinkingLabel}
                </span>
                <span className="flex items-center gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400"
                    style={{ animationDelay: "140ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-400"
                    style={{ animationDelay: "280ms" }}
                  />
                </span>
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>

      {showScrollButton && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute right-4 bottom-36 z-30 rounded-full border border-slate-200/80 bg-white p-2.5 text-slate-600 shadow-xl animate-scale-in hover:scale-110 active:scale-95 sm:right-6 sm:p-3 dark:border-gray-700/50 dark:bg-[#1e2029] dark:text-gray-300"
          aria-label="Scroll to latest message"
        >
          <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}

      <ChatInput
        input={input}
        setInput={setInput}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        isStreaming={isStreaming}
        isThinking={isThinking}
        onSend={sendMessage}
        onStop={handleStop}
        textareaRef={textareaRef}
        rotatePlaceholder={isEmpty}
      />
    </div>
  );
}
