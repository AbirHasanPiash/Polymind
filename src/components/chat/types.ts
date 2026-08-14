export type MessageRole = "user" | "ai" | "system";

export type ChatAttachment = {
  name: string;
  type: string;
  size: number;
  mime_type?: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  model?: string | null;
  attachments?: ChatAttachment[];
  createdAt?: number;
};

/** Metadata returned by POST /chat/upload, sent back with the next message. */
export type UploadedFileMeta = {
  id: string;
  name: string;
  type: string;
  size: number;
  mime_type?: string;
  error?: string;
};
