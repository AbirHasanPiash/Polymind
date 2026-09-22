import { memo, useState } from "react";
import { AlertTriangle, Check, Copy, FileText, ImageIcon, Pencil, RefreshCw, Volume2, VolumeX } from "lucide-react";

import type { ApiModel } from "../../api/types";
import { formatBytes, formatCost, formatDuration } from "../../lib/format";
import { INTENT_LABELS, displayName, guessProvider } from "../../lib/models";
import { cn } from "../../lib/utils";
import { ProviderMark } from "../brand/ProviderMark";
import { Tooltip } from "../ui/overlays";
import { Badge } from "../ui/primitives";
import { Markdown } from "./Markdown";
import type { UIMessage } from "./types";

export type BubbleActions = {
  onCopy: (text: string, id: string) => void;
  onRegenerate?: (message: UIMessage) => void;
  onEdit?: (message: UIMessage) => void;
  onReadAloud?: (message: UIMessage) => void;
  readAloudState?: { id: string | null; state: "idle" | "loading" | "playing" };
};

type Props = {
  message: UIMessage;
  models: ApiModel[];
  isCopied: boolean;
  showCosts: boolean;
  isLast: boolean;
  actions: BubbleActions;
  /** Inside an arena row the bubble fills its column. */
  column?: boolean;
};

function ActionButton({
  label,
  onClick,
  children,
  active = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn("rounded-md p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg", active && "text-accent")}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function UserBubble({ message, isCopied, actions }: { message: UIMessage; isCopied: boolean; actions: BubbleActions }) {
  return (
    <div className="group flex w-full justify-end animate-rise-in">
      <div className="flex max-w-[88%] flex-col items-end gap-1 sm:max-w-[78%]">
        <div className="rounded-2xl rounded-br-md bg-accent-soft px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words text-fg">
          {message.content}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.attachments.map((file, index) => (
                <span key={`${file.name}-${index}`} className="flex items-center gap-1.5 rounded-lg bg-surface/70 px-2 py-1 text-xs text-fg-muted">
                  {file.type.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                  <span className="max-w-[12rem] truncate">{file.name}</span>
                  <span className="font-mono text-[10px] text-fg-subtle">{formatBytes(file.size)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          {actions.onEdit && !message.id.startsWith("local-") && (
            <ActionButton label="Edit and resend" onClick={() => actions.onEdit?.(message)}>
              <Pencil className="h-3.5 w-3.5" />
            </ActionButton>
          )}
          <ActionButton label={isCopied ? "Copied" : "Copy"} onClick={() => actions.onCopy(message.content, message.id)}>
            {isCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({ message, models, isCopied, showCosts, isLast, actions, column }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const provider = models.find((m) => m.id === message.model)?.provider ?? guessProvider(message.model);
  const name = displayName(message.model, models);
  const streaming = message.status === "streaming";
  const trouble = message.status === "error" || message.status === "refused";
  const reading = actions.readAloudState?.id === message.id ? actions.readAloudState.state : "idle";

  return (
    <div className={cn("group flex w-full min-w-0 flex-col animate-rise-in", column && "h-full")}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2 px-1">
        <ProviderMark provider={provider} size="sm" />
        <span className="text-xs font-semibold text-fg">{name}</span>
        {message.intent && message.intent !== "pinned" && (
          <Tooltip content={message.reason}>
            <span>
              <Badge tone="accent">Auto · {INTENT_LABELS[message.intent] ?? message.intent}</Badge>
            </span>
          </Tooltip>
        )}
        {message.status === "interrupted" && <Badge tone="warning">Stopped</Badge>}
        {message.status === "length" && <Badge tone="warning">Cut short</Badge>}
        {trouble && <Badge tone="danger">Failed</Badge>}
        {streaming && (
          <span className="flex items-center gap-1" aria-label="Generating">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-3" style={{ animationDelay: "140ms" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-2" style={{ animationDelay: "280ms" }} />
          </span>
        )}
      </div>

      <div
        className={cn(
          "min-w-0 rounded-2xl rounded-tl-md border px-4 py-3.5 sm:px-5",
          trouble ? "border-danger/30 bg-danger/5" : "border-line bg-surface",
          column && "flex-1",
        )}
      >
        {message.content ? (
          showRaw ? (
            <pre className="custom-scrollbar overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-fg">{message.content}</pre>
          ) : (
            <Markdown content={message.content} />
          )
        ) : streaming ? (
          <div className="space-y-2 py-1">
            <div className="h-3 w-3/4 animate-shimmer rounded" />
            <div className="h-3 w-1/2 animate-shimmer rounded" />
          </div>
        ) : null}

        {message.notes && message.notes.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-fg-muted">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <span>{message.notes.join(" ")}</span>
          </div>
        )}
      </div>

      {!streaming && message.content && (
        <div className="mt-1 flex flex-wrap items-center gap-0.5 px-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <ActionButton label={isCopied ? "Copied" : "Copy"} onClick={() => actions.onCopy(message.content, message.id)}>
            {isCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </ActionButton>
          {actions.onReadAloud && !message.id.startsWith("local-") && (
            <ActionButton
              label={reading === "playing" ? "Stop reading" : reading === "loading" ? "Preparing audio…" : "Read aloud"}
              onClick={() => actions.onReadAloud?.(message)}
              active={reading !== "idle"}
            >
              {reading === "playing" ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className={cn("h-3.5 w-3.5", reading === "loading" && "animate-pulse")} />}
            </ActionButton>
          )}
          {isLast && actions.onRegenerate && (
            <ActionButton label="Regenerate" onClick={() => actions.onRegenerate?.(message)}>
              <RefreshCw className="h-3.5 w-3.5" />
            </ActionButton>
          )}
          <ActionButton label={showRaw ? "Rendered view" : "Plain text"} onClick={() => setShowRaw((v) => !v)}>
            <span className="font-mono text-[10px] font-semibold">{showRaw ? "MD" : "TXT"}</span>
          </ActionButton>
          {showCosts && (message.cost !== undefined || message.completionTokens) && (
            <span className="ml-1 font-mono text-[11px] text-fg-subtle">
              {message.cost !== undefined && message.cost !== null && `${formatCost(message.cost)} cr`}
              {message.completionTokens ? ` · ${message.completionTokens} tok` : ""}
              {message.durationMs ? ` · ${formatDuration(message.durationMs)}` : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubbleComponent(props: Props) {
  const { message } = props;

  if (message.role === "system") {
    return (
      <div className="flex w-full justify-center animate-rise-in">
        <div className="max-w-2xl rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs text-fg-muted sm:text-sm">
          {message.content}
        </div>
      </div>
    );
  }
  if (message.role === "user") {
    return <UserBubble message={message} isCopied={props.isCopied} actions={props.actions} />;
  }
  return <AssistantBubble {...props} />;
}

/**
 * One message in the transcript.
 *
 * `memo` is what keeps streaming smooth: only the message currently receiving
 * tokens re-renders.
 */
export const MessageBubble = memo(MessageBubbleComponent);
