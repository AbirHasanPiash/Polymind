import type { ChatAttachment } from "../../api/types";

export type MessageStatus = "streaming" | "done" | "error" | "interrupted" | "refused" | "length";

export type UIMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string | null;
  servedModel?: string | null;
  /** Arena column this reply belongs to. */
  slot?: number;
  /** The user message an assistant reply answers; arena replies share one. */
  parentId?: string | null;
  status?: MessageStatus;
  cost?: number | string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  durationMs?: number | null;
  notes?: string[];
  attachments?: ChatAttachment[];
  createdAt?: number;
  intent?: string;
  reason?: string;
};

export type ModelSelection = { mode: "single"; model: string } | { mode: "arena"; models: string[] };

export type TranscriptRow =
  | { kind: "user"; message: UIMessage }
  | { kind: "system"; message: UIMessage }
  | { kind: "assistant"; messages: UIMessage[]; key: string };

/** Group arena replies that answer the same prompt into one row of columns. */
export function buildRows(messages: UIMessage[]): TranscriptRow[] {
  const rows: TranscriptRow[] = [];
  for (const message of messages) {
    if (message.role === "assistant") {
      const last = rows[rows.length - 1];
      if (
        last &&
        last.kind === "assistant" &&
        message.parentId &&
        last.messages[0]?.parentId === message.parentId
      ) {
        last.messages.push(message);
        continue;
      }
      rows.push({ kind: "assistant", messages: [message], key: message.parentId ?? message.id });
    } else if (message.role === "user") {
      rows.push({ kind: "user", message });
    } else {
      rows.push({ kind: "system", message });
    }
  }
  return rows;
}
