import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CpuChipIcon,
  CheckIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAuth } from "../context/AuthContext";
import "katex/dist/katex.min.css";
import { useChatReset } from "../context/ChatResetContext";
import ChatInput from "../components/ChatInput";
import ModelSelector from "../components/ModelSelector";

// Types

type Attachment = {
  name: string;
  type: string;
  size: number;
  mime_type?: string;
};

type CodeProps = {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
};

type Message = {
  role: "user" | "ai" | "system";
  content: string;
  model?: string | null;
  timestamp?: number;
  id: string;
  attachments?: Attachment[];
};

type UploadedFileMeta = {
  id: string;
  name: string;
  type: string;
  size: number;
  mime_type: string;
};

type WebSocketPayload =
  | { type: "content"; delta: string }
  | {
      type: "system";
      event: "chat_id" | "route" | "cost" | "warning";
      payload: string;
    }
  | { type: "error"; message: string };

type CopiedState = { [key: string]: boolean };

// Constants

const PLACEHOLDERS = [
  "What do you want to build today?",
  "Start typing - I’ll handle the rest",
  "From idea to execution, faster than ever",
  "Write, debug, and explore - all in one place",
  "Think better. Build faster. Ship smarter.",
];

// CodeBlock Component

const CodeBlock = (props: CodeProps) => {
  const { node, className, children, inline = false, ...rest } = props;
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");
  const lineCount = codeString.split("\n").length;
  const shouldTruncate = lineCount > 20;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed copy", err);
    }
  };

  if (inline || !match) {
    return (
      <code
        className="bg-slate-200 dark:bg-gray-800/60 text-blue-700 dark:text-blue-300 rounded-md px-1.5 sm:px-2 py-0.5 text-[0.85em] sm:text-[0.9em] font-mono border border-slate-300 dark:border-gray-700/40"
        {...rest}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="my-4 sm:my-6 rounded-xl overflow-hidden bg-[#1e1e1e] border border-gray-700/40 shadow-2xl">
      {/* Code header */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 bg-[#2d2d2d]/80 border-b border-gray-700/40 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/90 ring-1 ring-red-400/30 shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/90 ring-1 ring-yellow-400/30 shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-green-500/90 ring-1 ring-green-400/30 shadow-sm" />
          </div>
          <span className="text-[10px] sm:text-xs text-gray-400 font-mono font-semibold uppercase tracking-widest">
            {language || "plaintext"}
          </span>
          <span className="text-[10px] sm:text-xs text-gray-600 font-mono border-l border-gray-700 pl-2 sm:pl-3">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[10px] sm:text-xs text-gray-400 hover:text-blue-400 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg hover:bg-gray-700/40 transition-all duration-150"
            >
              <span className="hidden sm:inline font-medium">
                {isExpanded ? "Collapse" : "Expand"}
              </span>
              <ChevronDownIcon
                className={`w-3 sm:w-3.5 h-3 sm:h-3.5 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-gray-700/40 transition-all duration-150"
            title="Copy code"
          >
            {isCopied ? (
              <CheckIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-400" />
            ) : (
              <ClipboardDocumentIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div
        className={`relative overflow-hidden transition-all duration-300 ${
          shouldTruncate && !isExpanded
            ? "max-h-[400px] sm:max-h-[500px]"
            : "max-h-none"
        }`}
      >
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "#1e1e1e",
            fontSize: "0.8rem",
            lineHeight: "1.6",
          }}
          showLineNumbers={lineCount > 5}
          wrapLines={true}
          {...rest}
        >
          {codeString}
        </SyntaxHighlighter>
        {shouldTruncate && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-24 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/80 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
};

// Markdown Components

const sharedComponents: Partial<Components> = {
  p: ({ children }) => (
    <p className="mb-4 last:mb-0 leading-[1.75] text-slate-700 dark:text-gray-100 text-sm sm:text-[15px]">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-5 sm:ml-6 mb-4 space-y-2 text-slate-700 dark:text-gray-100 text-sm sm:text-[15px]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-5 sm:ml-6 mb-4 space-y-2 text-slate-700 dark:text-gray-100 text-sm sm:text-[15px]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-[1.75] pl-1">{children}</li>,
  h1: ({ children }) => (
    <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5 mt-6 sm:mt-7 text-slate-900 dark:text-white border-b border-slate-200 dark:border-gray-700/50 pb-2 sm:pb-3">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 mt-5 sm:mt-6 text-slate-900 dark:text-white">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 mt-4 sm:mt-5 text-slate-800 dark:text-gray-100">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base sm:text-lg font-semibold mb-2 mt-3 sm:mt-4 text-slate-700 dark:text-gray-200">
      {children}
    </h4>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-500/80 bg-blue-50 dark:bg-blue-500/5 pl-4 sm:pl-5 pr-3 sm:pr-4 py-2 sm:py-3 italic my-4 sm:my-5 text-slate-600 dark:text-gray-200 rounded-r-lg text-sm sm:text-base">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 sm:my-6 rounded-lg border border-slate-200 dark:border-gray-700/50">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700/50">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-100 dark:bg-gray-800/50">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-200 dark:divide-gray-700/30 bg-white/50 dark:bg-gray-900/20">
      {children}
    </tbody>
  ),
  th: ({ children }) => (
    <th className="px-3 sm:px-5 py-2 sm:py-3.5 text-left text-xs sm:text-sm font-semibold text-slate-800 dark:text-gray-200 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 sm:px-5 py-2 sm:py-3.5 text-xs sm:text-sm text-slate-700 dark:text-gray-300 leading-relaxed">
      {children}
    </td>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-700 dark:text-gray-200">{children}</em>
  ),
  hr: () => (
    <hr className="my-4 sm:my-6 border-slate-200 dark:border-gray-700/50" />
  ),
  code: CodeBlock,
};

// Main ChatPage Component

export default function ChatPage() {
  const { token, refreshProfile } = useAuth();
  const { chatId: routeChatId } = useParams();
  const navigate = useNavigate();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [model, setModel] = useState(() => {
    return sessionStorage.getItem("selectedModel") || "auto";
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [copiedStates, setCopiedStates] = useState<CopiedState>({});

  const activeChatId = routeChatId || null;

  const [placeholderText, setPlaceholderText] = useState(PLACEHOLDERS[0]);
  const [fadePlaceholder, setFadePlaceholder] = useState(true);

  // Refs
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef(true);
  const currentStreamModel = useRef<string | null>(null);
  const { resetKey } = useChatReset();

  const internalChatIdRef = useRef<string | null>(activeChatId);
  const isStreamingRef = useRef(false);

  const [isModelOpen, setIsModelOpen] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);

  const API_BASE = import.meta.env.VITE_API_URL;

  // Effects

  useEffect(() => {
    internalChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    sessionStorage.setItem("selectedModel", model);
  }, [model]);

  // Auto-focus text box on typing
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;
      if (e.key.length === 1) textareaRef.current?.focus();
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setIsModelOpen(false);
      }
    };
    if (isModelOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isModelOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModelOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Rotating placeholder
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setFadePlaceholder(false);
      setTimeout(() => {
        index = (index + 1) % PLACEHOLDERS.length;
        setPlaceholderText(PLACEHOLDERS[index]);
        setFadePlaceholder(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch history on mount
  useEffect(() => {
    let isActive = true;
    async function loadHistory() {
      if (!activeChatId || !token) {
        if (isActive) setMessages([]);
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/chat/history/${activeChatId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const histMessages = await res.json();
          const formattedMessages: Message[] = histMessages.map(
            (m: any, idx: number) => ({
              role: m.role,
              content: m.content,
              model: m.model,
              id: m.id || `hist-${idx}-${Date.now()}`,
              timestamp: new Date(m.created_at).getTime(),
              attachments: m.attachments || [],
            })
          );
          if (isActive) setMessages(formattedMessages);
        } else {
          if (isActive) navigate("/dashboard");
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
    loadHistory();
    return () => { isActive = false; };
  }, [activeChatId, token, navigate]);

  // WebSocket connection
  useEffect(() => {
    if (!token) return;
    let isCleanup = false;
    let reconnectTimer: number | undefined;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host =
      window.location.hostname === "localhost"
        ? "localhost:8000"
        : "api.multiaimodel.com";

    const connect = () => {
      const targetChatId = internalChatIdRef.current || activeChatId || "";
      const wsUrl = `${protocol}://${host}/api/v1/chat/ws?token=${token}&model=${model}${
        targetChatId ? `&chat_id=${targetChatId}` : ""
      }`;
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        if (isCleanup) { socket?.close(); return; }
      };

      socket.onclose = (event) => {
        if (isCleanup) return;
        setIsStreaming(false);
        setIsThinking(false);
        isStreamingRef.current = false;
        if (event.code === 1008) {
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: "⚠️ Disconnected: Insufficient credits or authentication issue.",
              id: `sys-${Date.now()}`,
            },
          ]);
          return;
        }
        reconnectTimer = setTimeout(() => {
          if (!isCleanup) connect();
        }, 3000);
      };

      socket.onmessage = (event) => {
        if (isCleanup) return;
        try {
          const data: WebSocketPayload = JSON.parse(event.data);
          if (data.type === "system") {
            const { event: sysEvent, payload } = data;
            if (sysEvent === "chat_id") {
              const newId = payload;
              internalChatIdRef.current = newId;
              if (!activeChatId) {
                window.history.replaceState(null, "", `/dashboard/chat/${newId}`);
              }
            } else if (sysEvent === "warning") {
              console.warn("System Warning:", payload);
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `⚠️ Warning: ${payload}`,
                  id: `warn-${Date.now()}`,
                },
              ]);
            } else if (sysEvent === "route") {
              currentStreamModel.current = payload;
            } else if (sysEvent === "cost") {
              refreshProfile();
              setIsStreaming(false);
              isStreamingRef.current = false;
              currentStreamModel.current = null;
            }
            return;
          }
          if (data.type === "error") {
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `⚠️ Error: ${data.message}`,
                id: `err-${Date.now()}`,
              },
            ]);
            setIsStreaming(false);
            setIsThinking(false);
            isStreamingRef.current = false;
            return;
          }
          if (data.type === "content") {
            const textChunk = data.delta;
            setIsThinking(false);
            setIsStreaming(true);
            const wasStreaming = isStreamingRef.current;
            isStreamingRef.current = true;
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === "ai" && wasStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, content: lastMsg.content + textChunk },
                ];
              } else {
                return [
                  ...prev,
                  {
                    role: "ai",
                    content: textChunk,
                    model: currentStreamModel.current,
                    id: `ai-${Date.now()}`,
                  },
                ];
              }
            });
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", event.data);
        }
      };
    };

    connect();
    return () => {
      isCleanup = true;
      clearTimeout(reconnectTimer);
      if (ws.current) ws.current.close();
    };
  }, [token, model, activeChatId]);

  // Scroll Logic

  const scrollToBottom = useCallback((smooth = false) => {
    if (!chatContainerRef.current) return;
    chatContainerRef.current.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
    setShowScrollButton(false);
  }, []);

  useEffect(() => {
    if (!isAutoScrollEnabled.current) return;
    const timeoutId = setTimeout(() => {
      if (isStreaming) {
        scrollToBottom(false);
      } else {
        scrollToBottom(true);
      }
    }, 10);
    return () => clearTimeout(timeoutId);
  }, [messages, isStreaming, scrollToBottom]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 250;
    isAutoScrollEnabled.current = isAtBottom;
    setShowScrollButton(!isAtBottom);
  };

  // Send / Stop

  const sendMessage = async () => {
    if (
      (!input.trim() && selectedFiles.length === 0) ||
      !ws.current ||
      isStreaming ||
      isThinking
    )
      return;

    const attachmentMeta: Attachment[] = selectedFiles.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: input,
        attachments: attachmentMeta,
        id: `user-${Date.now()}`,
      },
    ]);

    setThinkingMessage(
      selectedFiles.length > 0 ? "Uploading and analyzing..." : "Thinking..."
    );
    setIsThinking(true);

    let processedAttachments: UploadedFileMeta[] = [];
    if (selectedFiles.length > 0) {
      try {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("files", file));
        const res = await fetch(`${API_BASE}/api/v1/chat/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Upload failed");
        }
        const data = await res.json();
        processedAttachments = data.files.filter((f: any) => f.id);
        const failedFiles = data.files.filter((f: any) => !f.id);
        if (failedFiles.length > 0) {
          console.error("Some files failed to upload:", failedFiles);
        }
      } catch (error) {
        console.error("File upload error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: "⚠️ Failed to upload attachments. Please try again.",
            id: `sys-${Date.now()}`,
          },
        ]);
        setIsThinking(false);
        return;
      }
    }

    ws.current.send(
      JSON.stringify({
        type: "user_message",
        content: input,
        attachments: processedAttachments,
      })
    );

    setInput("");
    setSelectedFiles([]);
    isAutoScrollEnabled.current = true;
    setTimeout(scrollToBottom, 10);
  };

  useEffect(() => {
    setMessages([]);
    setIsStreaming(false);
    setIsThinking(false);
    isStreamingRef.current = false;
    currentStreamModel.current = null;
    internalChatIdRef.current = null;
    ws.current?.close();
    ws.current = null;
  }, [resetKey]);

  const handleStop = () => {
    if (ws.current && (isStreaming || isThinking)) {
      setIsStreaming(false);
      setIsThinking(false);
      isStreamingRef.current = false;
      ws.current.close();
    }
  };

  const handleCopyMessage = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [id]: true }));
      setTimeout(
        () => setCopiedStates((prev) => ({ ...prev, [id]: false })),
        2000
      );
    } catch (err) {
      console.error("Failed copy", err);
    }
  };

  // Helpers

  const getFileInfo = (type: string, name: string) => {
    const lowerName = name.toLowerCase();
    if (type.startsWith("image/") || lowerName.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i))
      return { icon: "🖼️", color: "from-pink-500/10 dark:from-pink-500/20 to-rose-500/10 dark:to-rose-500/20", border: "border-pink-200 dark:border-pink-400/40", text: "text-pink-700 dark:text-pink-200" };
    if (type.startsWith("video/") || lowerName.match(/\.(mp4|avi|mov|mkv|webm)$/i))
      return { icon: "🎥", color: "from-purple-500/10 dark:from-purple-500/20 to-violet-500/10 dark:to-violet-500/20", border: "border-purple-200 dark:border-purple-400/40", text: "text-purple-700 dark:text-purple-200" };
    if (type.startsWith("audio/") || lowerName.match(/\.(mp3|wav|ogg|flac|m4a)$/i))
      return { icon: "🎵", color: "from-cyan-500/10 dark:from-cyan-500/20 to-blue-500/10 dark:to-blue-500/20", border: "border-cyan-200 dark:border-cyan-400/40", text: "text-cyan-700 dark:text-cyan-200" };
    if (type === "application/pdf" || lowerName.endsWith(".pdf"))
      return { icon: "📄", color: "from-red-500/10 dark:from-red-500/20 to-orange-500/10 dark:to-orange-500/20", border: "border-red-200 dark:border-red-400/40", text: "text-red-700 dark:text-red-200" };
    if (type.includes("document") || lowerName.match(/\.(doc|docx|txt|rtf)$/i))
      return { icon: "📝", color: "from-blue-500/10 dark:from-blue-500/20 to-indigo-500/10 dark:to-indigo-500/20", border: "border-blue-200 dark:border-blue-400/40", text: "text-blue-700 dark:text-blue-200" };
    if (type.includes("spreadsheet") || lowerName.match(/\.(xls|xlsx|csv)$/i))
      return { icon: "📊", color: "from-green-500/10 dark:from-green-500/20 to-emerald-500/10 dark:to-emerald-500/20", border: "border-green-200 dark:border-green-400/40", text: "text-green-700 dark:text-green-200" };
    if (type.includes("presentation") || lowerName.match(/\.(ppt|pptx)$/i))
      return { icon: "📊", color: "from-orange-500/10 dark:from-orange-500/20 to-amber-500/10 dark:to-amber-500/20", border: "border-orange-200 dark:border-orange-400/40", text: "text-orange-700 dark:text-orange-200" };
    if (type.includes("zip") || type.includes("compressed") || lowerName.match(/\.(zip|rar|7z|tar|gz)$/i))
      return { icon: "📦", color: "from-yellow-500/10 dark:from-yellow-500/20 to-amber-500/10 dark:to-amber-500/20", border: "border-yellow-200 dark:border-yellow-400/40", text: "text-yellow-700 dark:text-yellow-200" };
    if (lowerName.match(/\.(js|jsx|ts|tsx|py|java|cpp|c|html|css|json|xml)$/i))
      return { icon: "💻", color: "from-slate-500/10 dark:from-slate-500/20 to-gray-500/10 dark:to-gray-500/20", border: "border-slate-200 dark:border-slate-400/40", text: "text-slate-700 dark:text-slate-200" };
    return { icon: "📎", color: "from-gray-500/10 dark:from-gray-500/20 to-slate-500/10 dark:to-slate-500/20", border: "border-gray-200 dark:border-gray-400/40", text: "text-gray-700 dark:text-gray-200" };
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Render

  return (
    <div className="flex flex-col h-full bg-blue-50 dark:bg-gradient-to-br dark:from-[#0a0b0f] dark:via-[#0d0e14] dark:to-[#0a0b0f] relative transition-colors duration-300">

      {/* ── Subtle ambient glow (dark mode) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-600/5 dark:bg-blue-600/[0.04] blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-purple-600/5 dark:bg-purple-600/[0.04] blur-3xl" />
      </div>

      {/* ── Header ── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-5 py-3 flex justify-end pointer-events-none">
        <div className="relative pointer-events-auto" ref={modelRef}>

          {/* When closed → chip icon pill */}
          {!isModelOpen && (
            <button
              onClick={() => setIsModelOpen(true)}
              className="group flex items-center gap-2 px-3 py-2 rounded-xl
                bg-white/80 dark:bg-[#1a1d25]/80 backdrop-blur-xl
                border border-slate-200/80 dark:border-gray-700/50
                shadow-sm hover:shadow-md
                ring-0 hover:ring-1 hover:ring-blue-400/30 dark:hover:ring-blue-500/30
                transition-all duration-200 hover:scale-[1.03]"
            >
              <CpuChipIcon className="w-4 h-4 text-slate-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-150" />
            </button>
          )}

          {/* When open → inline model selector panel (same position, no button behind it) */}
          {isModelOpen && (
            <div
              className="
                origin-top-right
                animate-in fade-in zoom-in-95 slide-in-from-top-1
                duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]
              "
            >
              <div
                className="
                  relative
                  bg-white/95 dark:bg-[#13151c]/95 backdrop-blur-xl
                  border border-slate-200/80 dark:border-gray-700/50
                  rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40
                  p-3 w-[264px]
                  ring-1 ring-black/[0.03] dark:ring-white/[0.03]
                "
              >
                {/* Close button */}
                <button
                  onClick={() => setIsModelOpen(false)}
                  className="
                    absolute top-2.5 right-2.5
                    p-1 rounded-lg
                    text-slate-400 dark:text-gray-500
                    hover:text-slate-600 dark:hover:text-gray-300
                    hover:bg-slate-100 dark:hover:bg-gray-700/50
                    transition-all duration-150
                  "
                  aria-label="Close model selector"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>

                {/* Label */}
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-gray-500 mb-2.5 px-1">
                  Select Model
                </p>

                <ModelSelector model={model} setModel={setModel} />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Chat content ── */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-16 sm:pt-20 pb-4 px-3 sm:px-4 md:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
      >
        <div className="mx-auto space-y-4 sm:space-y-5 transition-all duration-300 max-w-5xl">

          {/* ── Empty state ── */}
          {messages.length === 0 && (
            <div className="h-[60vh] sm:h-[65vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-1000 px-4">
              <div className="relative mb-8 sm:mb-10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl sm:rounded-3xl blur-2xl sm:blur-3xl opacity-20 animate-pulse" />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl rotate-6 hover:rotate-0 transition-transform duration-500">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2 sm:mb-3">
                Ready to Assist
              </h2>
              <p className="text-slate-500 dark:text-gray-400 text-base sm:text-lg max-w-md px-4">
                Ask questions, write code, analyze data, or explore ideas together
              </p>
            </div>
          )}

          {/* ── Messages ── */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } animate-in slide-in-from-bottom-2 duration-400`}
            >
              <div
                className={`relative group ${
                  msg.role === "user"
                    ? "max-w-[90%] sm:max-w-[85%]"
                    : msg.role === "system"
                    ? "w-full max-w-3xl"
                    : "max-w-[95%] sm:max-w-[92%]"
                } rounded-2xl transition-all ${
                  msg.role === "user"
                    ? // ── User bubble: richer gradient + subtle inner highlight ──
                      `bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700
                       text-white shadow-xl shadow-blue-500/25
                       ring-1 ring-white/10
                       px-4 sm:px-5 py-3 sm:py-4 rounded-br-sm`
                    : msg.role === "system"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300/90 text-xs sm:text-sm font-mono py-2 sm:py-3 px-4 sm:px-5 text-center rounded-xl mx-auto"
                    : // ── AI bubble: elevated glass card ──
                      `bg-white dark:bg-[#13151c]
                       border border-slate-200/80 dark:border-gray-700/30
                       text-slate-800 dark:text-gray-100
                       shadow-sm dark:shadow-2xl
                       ring-1 ring-black/[0.02] dark:ring-white/[0.02]
                       px-4 sm:px-6 py-4 sm:py-5 rounded-bl-sm`
                }`}
              >
                {/* ── AI message ── */}
                {msg.role === "ai" && (
                  <div className="flex flex-col gap-3">
                    <div className="prose prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600 dark:prose-a:text-blue-400">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={sharedComponents}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Model badge */}
                    {msg.model && (
                      <div className="flex items-center gap-2 mt-1 pt-3 border-t border-slate-100 dark:border-gray-700/40">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20 backdrop-blur-sm">
                          <CpuChipIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-purple-600 dark:text-purple-400" />
                          <span className="text-[10px] sm:text-[11px] font-semibold text-purple-600 dark:text-purple-300 uppercase tracking-widest">
                            {msg.model}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── System message ── */}
                {msg.role === "system" && (
                  <div className="leading-[1.7] break-words whitespace-pre-wrap text-sm sm:text-[15px]">
                    {msg.content}
                  </div>
                )}

                {/* ── User message ── */}
                {msg.role === "user" && (
                  <div className="space-y-3">
                    {msg.content && (
                      <div className="leading-[1.7] break-words whitespace-pre-wrap text-sm sm:text-[15px]">
                        {msg.content}
                      </div>
                    )}

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-blue-300 dark:text-blue-200/70 font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                          </svg>
                          <span>
                            {msg.attachments.length}{" "}
                            {msg.attachments.length === 1 ? "Attachment" : "Attachments"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.attachments.map((file, idx) => {
                            const fileInfo = getFileInfo(file.type, file.name);
                            return (
                              <div
                                key={idx}
                                className={`group/file relative flex items-center gap-2 bg-gradient-to-br ${fileInfo.color} backdrop-blur-sm border ${fileInfo.border} rounded-lg px-3 py-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
                              >
                                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/40 dark:bg-white/10 backdrop-blur-sm">
                                  <span className="text-lg">{fileInfo.icon}</span>
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className={`text-xs font-semibold ${fileInfo.text} truncate max-w-[180px] sm:max-w-[280px]`}>
                                    {file.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-blue-300/60 font-medium">
                                    {formatSize(file.size)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Copy button — AI ── */}
                {msg.role === "ai" && (
                  <button
                    onClick={() => handleCopyMessage(msg.content, `msg-${msg.id}`)}
                    className="
                      absolute -bottom-2.5 -right-2.5
                      p-2 sm:p-2.5
                      bg-white dark:bg-[#1e2029]
                      hover:bg-slate-50 dark:hover:bg-[#272b36]
                      border border-slate-200/80 dark:border-gray-700/50
                      rounded-xl shadow-lg
                      transition-all duration-150
                      opacity-0 group-hover:opacity-100
                      hover:scale-110 active:scale-95
                    "
                    title="Copy message"
                  >
                    {copiedStates[`msg-${msg.id}`] ? (
                      <CheckIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <DocumentDuplicateIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-400 dark:text-gray-400" />
                    )}
                  </button>
                )}

                {/* ── Copy button — User ── */}
                {msg.role === "user" && (
                  <button
                    onClick={() => handleCopyMessage(msg.content, `msg-${msg.id}`)}
                    className="
                      absolute -bottom-2.5 -left-2.5
                      p-2 sm:p-2.5
                      bg-blue-800/80 hover:bg-blue-700/80
                      border border-blue-600/30
                      rounded-xl shadow-lg
                      transition-all duration-150
                      opacity-0 group-hover:opacity-100
                      hover:scale-110 active:scale-95
                    "
                    title="Copy message"
                  >
                    {copiedStates[`msg-${msg.id}`] ? (
                      <CheckIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-white" />
                    ) : (
                      <DocumentDuplicateIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-white" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* ── Thinking indicator ── */}
          {isThinking && (
            <div className="flex items-start gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-1 duration-300 pl-2 sm:pl-3">
              {/* Spinner */}
              <div className="relative mt-0.5 shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 relative">
                  {/* Outer pulse ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-ping" />
                  {/* Spinning ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500/70 border-r-purple-500/30 animate-spin" />
                  {/* Inner dot */}
                  <div className="absolute inset-2 rounded-full bg-white dark:bg-[#0d0e14] flex items-center justify-center shadow-inner">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="mt-0.5 sm:mt-1">
                <div className="
                  inline-flex items-center gap-2.5
                  px-4 py-2.5
                  bg-white dark:bg-[#13151c]
                  border border-slate-200/80 dark:border-gray-700/30
                  rounded-2xl rounded-bl-sm
                  shadow-sm dark:shadow-xl
                  ring-1 ring-black/[0.02] dark:ring-white/[0.02]
                ">
                  <span className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 font-medium">
                    {thinkingMessage}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "140ms" }} />
                    <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "280ms" }} />
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* ── Scroll to bottom button ── */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom(true)}
          className="
            fixed right-4 sm:right-6 top-1/2 -translate-y-1/2
            bg-white dark:bg-[#1e2029]
            border border-slate-200/80 dark:border-gray-700/50
            text-slate-600 dark:text-gray-300
            rounded-full p-2.5 sm:p-3
            shadow-xl dark:shadow-black/40
            ring-1 ring-black/[0.04] dark:ring-white/[0.04]
            z-30
            hover:scale-110 active:scale-95
            transition-all duration-150
            animate-in fade-in zoom-in-90 duration-200
          "
          aria-label="Scroll to bottom"
        >
          <ChevronDownIcon className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>
      )}

      {/* ── Chat input ── */}
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
        isFullWidth={false}
        showEmptyStatePlaceholder={messages.length === 0}
        placeholderText={placeholderText}
        fadePlaceholder={fadePlaceholder}
      />
    </div>
  );
}