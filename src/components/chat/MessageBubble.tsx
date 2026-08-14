import { memo } from "react";
import { CheckIcon, CpuChipIcon, DocumentDuplicateIcon, PaperClipIcon } from "@heroicons/react/24/solid";

import { formatBytes } from "../../lib/format";
import { cn } from "../../lib/utils";
import { Markdown } from "./Markdown";
import type { ChatAttachment, ChatMessage } from "./types";

type MessageBubbleProps = {
  message: ChatMessage;
  isCopied: boolean;
  onCopy: (text: string, id: string) => void;
};

/** Icon and palette per attachment kind. Pure lookup, no hooks. */
function attachmentStyle(type: string, name: string) {
  const lower = name.toLowerCase();
  if (type.startsWith("image/") || /\.(jpe?g|png|gif|webp|svg|bmp|ico)$/i.test(lower))
    return { icon: "🖼️", tint: "border-pink-200 dark:border-pink-400/40" };
  if (type === "application/pdf" || lower.endsWith(".pdf"))
    return { icon: "📄", tint: "border-red-200 dark:border-red-400/40" };
  if (type.includes("document") || /\.(docx?|txt|rtf)$/i.test(lower))
    return { icon: "📝", tint: "border-blue-200 dark:border-blue-400/40" };
  if (type.includes("spreadsheet") || /\.(xlsx?|csv)$/i.test(lower))
    return { icon: "📊", tint: "border-green-200 dark:border-green-400/40" };
  if (/\.(jsx?|tsx?|py|java|cpp|c|html|css|json|xml|ya?ml|sh)$/i.test(lower))
    return { icon: "💻", tint: "border-slate-200 dark:border-slate-400/40" };
  return { icon: "📎", tint: "border-gray-200 dark:border-gray-400/40" };
}

function AttachmentList({ attachments }: { attachments: ChatAttachment[] }) {
  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-100 sm:text-xs">
        <PaperClipIcon className="h-3 w-3" />
        <span>
          {attachments.length} {attachments.length === 1 ? "attachment" : "attachments"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {attachments.map((file, index) => {
          const { icon, tint } = attachmentStyle(file.type, file.name);
          return (
            <div
              key={`${file.name}-${index}`}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-lg border bg-white/15 px-3 py-2 backdrop-blur-sm",
                tint,
              )}
            >
              <span className="text-lg" aria-hidden="true">
                {icon}
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-semibold text-white/95">{file.name}</span>
                <span className="text-[10px] font-medium text-white/70">
                  {formatBytes(file.size)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One message in the transcript.
 *
 * `memo` is what keeps streaming smooth: only the message currently receiving
 * tokens re-renders. Without it every chunk re-rendered the entire transcript,
 * re-parsing markdown and re-highlighting every code block already on screen.
 */
function MessageBubbleComponent({ message, isCopied, onCopy }: MessageBubbleProps) {
  const { role, content, model, attachments } = message;

  if (role === "system") {
    return (
      <div className="flex w-full justify-center animate-rise-in">
        <div className="w-full max-w-3xl rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center font-mono text-xs text-amber-700 sm:py-3 sm:px-5 sm:text-sm dark:text-amber-300/90">
          {content}
        </div>
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div className={cn("flex w-full animate-rise-in", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "group relative min-w-0 rounded-2xl",
          isUser
            ? "max-w-[90%] rounded-br-sm bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 px-4 py-3 text-white shadow-lg shadow-blue-500/20 ring-1 ring-white/10 sm:max-w-[85%] sm:px-5 sm:py-4"
            : "max-w-[95%] rounded-bl-sm border border-slate-200/80 bg-white px-4 py-4 text-slate-800 shadow-sm sm:max-w-[92%] sm:px-6 sm:py-5 dark:border-gray-700/30 dark:bg-[#13151c] dark:text-gray-100 dark:shadow-xl",
        )}
      >
        {isUser ? (
          <div className="space-y-3">
            {content && (
              <div className="break-words whitespace-pre-wrap text-sm leading-[1.7] sm:text-[15px]">
                {content}
              </div>
            )}
            {attachments && attachments.length > 0 && <AttachmentList attachments={attachments} />}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Markdown content={content} />
            {model && (
              <div className="mt-1 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-gray-700/40">
                <span className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1">
                  <CpuChipIcon className="h-3 w-3 text-purple-600 sm:h-3.5 sm:w-3.5 dark:text-purple-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-600 sm:text-[11px] dark:text-purple-300">
                    {model}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Copy control. Always in the DOM so hovering does not reflow the
            bubble; it is revealed on hover, and on touch (no hover) it is
            permanently visible. */}
        <button
          type="button"
          onClick={() => onCopy(content, message.id)}
          className={cn(
            "absolute -bottom-2.5 rounded-xl p-2 shadow-lg",
            "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
            "hover:scale-110 active:scale-95",
            isUser
              ? "-left-2.5 border border-blue-600/30 bg-blue-800/90 hover:bg-blue-700"
              : "-right-2.5 border border-slate-200/80 bg-white hover:bg-slate-50 dark:border-gray-700/50 dark:bg-[#1e2029] dark:hover:bg-[#272b36]",
          )}
          aria-label="Copy message"
        >
          {isCopied ? (
            <CheckIcon
              className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isUser ? "text-white" : "text-emerald-500")}
            />
          ) : (
            <DocumentDuplicateIcon
              className={cn(
                "h-3.5 w-3.5 sm:h-4 sm:w-4",
                isUser ? "text-white" : "text-slate-400 dark:text-gray-400",
              )}
            />
          )}
        </button>
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);
