/**
 * Shapes returned by the Polymind API. Mirrors the backend's Pydantic schemas;
 * decimals arrive as strings to preserve precision and are coerced at the edge
 * with the helpers in `lib/format.ts`.
 */

export type Provider = "openai" | "anthropic" | "google";
export type Tier = "flagship" | "balanced" | "fast";
export type Effort = "low" | "medium" | "high";
export type ChatMode = "chat" | "arena";
export type Decimalish = number | string;

export interface ApiModel {
  id: string;
  provider: Provider;
  provider_label: string;
  display_name: string;
  description: string;
  tier: Tier;
  strengths: string[];
  reasoning: boolean;
  supports_vision: boolean;
  context_window: number;
  max_output_tokens: number;
  status: "stable" | "preview";
  released: string;
  badge: string | null;
  pricing: {
    input_credits_per_million: string;
    output_credits_per_million: string;
  };
}

export interface ModelCatalogue {
  models: ApiModel[];
  providers: { id: Provider; label: string; enabled: boolean }[];
  routing: Record<string, string>;
  effort_levels: Effort[];
  default_effort: Effort;
}

export interface Features {
  google_login: boolean;
  openai: boolean;
  anthropic: boolean;
  google: boolean;
  avatar_video: boolean;
  storage: boolean;
  stripe: boolean;
  razorpay: boolean;
  password_reset: boolean;
}

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
}

export interface Preferences {
  custom_instructions: string | null;
  default_model: string;
  default_effort: Effort;
  saved_prompts: SavedPrompt[];
  send_on_enter: boolean;
  show_costs: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  custom_instructions: null,
  default_model: "auto",
  default_effort: "medium",
  saved_prompts: [],
  send_on_enter: true,
  show_costs: true,
};

export interface Wallet {
  id?: string;
  credits: Decimalish;
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  is_active?: boolean;
  is_superuser: boolean;
  has_password: boolean;
  preferences: Preferences;
  created_at?: string | null;
  wallet?: Wallet | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ChatSummary {
  id: string;
  title: string | null;
  mode: ChatMode;
  pinned: boolean;
  system_prompt: string | null;
  share_token: string | null;
  created_at: string | null;
  updated_at: string | null;
  message_count: number;
}

export interface ChatAttachment {
  name: string;
  type: string;
  size: number;
  mime_type?: string | null;
}

export interface ApiMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  model: string | null;
  parent_id: string | null;
  attachments: ChatAttachment[];
  tokens: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost: Decimalish | null;
  duration_ms: number | null;
  finish_reason: string | null;
  created_at: string | null;
}

export interface SearchHit {
  chat_id: string;
  chat_title: string | null;
  message_id: string;
  role: "user" | "assistant";
  snippet: string;
  created_at: string | null;
}

export interface ShareInfo {
  share_token: string;
  url: string;
  shared_at: string | null;
}

export interface SharedChat {
  title: string | null;
  mode: ChatMode;
  created_at: string | null;
  shared_at: string | null;
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    model: string | null;
    parent_id: string | null;
    created_at: string | null;
  }[];
}

/** Metadata returned by POST /chat/upload, sent back with the next message. */
export interface UploadedFileMeta {
  id?: string;
  name: string;
  type: string;
  size: number;
  mime_type?: string;
  error?: string;
}

export interface UsagePoint {
  date: string;
  chat: Decimalish;
  image: Decimalish;
  audio: Decimalish;
  video: Decimalish;
}

export interface UsageSummary {
  days: number;
  balance: Decimalish;
  spent_credits: Decimalish;
  spent_by_category: Record<"chat" | "image" | "audio" | "video", Decimalish>;
  counts: Record<"messages" | "chats" | "images" | "audio" | "videos", number>;
  by_day: UsagePoint[];
  by_model: { model: string; messages: number; tokens: number; credits: Decimalish }[];
  recent: {
    kind: "chat" | "image" | "audio" | "video" | "purchase";
    title: string;
    credits: Decimalish;
    reference_id: string | null;
    created_at: string | null;
  }[];
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  price: Decimalish;
  currency?: string | null;
  credits: Decimalish;
  is_active: boolean;
  is_featured: boolean;
  created_at?: string | null;
}

export interface Transaction {
  id: string;
  amount: Decimalish;
  currency: string;
  credits_added: Decimalish;
  status: "pending" | "completed" | "failed";
  payment_gateway?: string | null;
  created_at: string | null;
  completed_at?: string | null;
  stripe_session_id?: string | null;
  razorpay_order_id?: string | null;
}

export interface Voice {
  id: string;
  provider: Provider;
  name: string;
  description: string;
  language: string;
  gender: "female" | "male" | "neutral";
  tier: "standard" | "premium";
  credits_per_1k_chars: string;
  enabled: boolean;
}

export interface ImageModelOption {
  id: string;
  provider: Provider;
  display_name: string;
  description: string;
  badge: string | null;
  strengths: string[];
  enabled: boolean;
  supports_reference: boolean;
  default_quality: string;
  default_size: string;
  qualities: { value: string; label: string }[];
  sizes: { value: string; label: string }[];
  /** quality -> size -> credits */
  prices: Record<string, Record<string, string>>;
}

export interface GeneratedImage {
  id: string;
  public_url: string;
  prompt: string;
  reference_image_url: string | null;
  revised_prompt: string | null;
  model: string;
  size: string;
  quality: string;
  cost: number;
  created_at: string | null;
}

export interface GeneratedAudio {
  id: string;
  public_url: string;
  text_prompt: string;
  voice_name: string | null;
  provider: string;
  source_message_id: string | null;
  cost: number;
  created_at: string | null;
}

export type VideoStatus = "processing" | "processing_external" | "completed" | "failed";

export interface GeneratedVideo {
  id: string;
  public_url: string | null;
  thumbnail_url: string | null;
  status: VideoStatus;
  script_text: string;
  avatar_image_url: string;
  error_message?: string | null;
  cost: number;
  created_at: string | null;
}

export interface AdminOverview {
  total_revenue: Decimalish;
  total_users: number;
  total_chats: number;
  active_users: number;
  new_users: number;
  total_images_generated: number;
  total_audio_generated: number;
  total_videos_generated: number;
  total_messages: number;
  total_tokens_consumed: number;
  total_ai_cost: Decimalish;
  spend_by_category: Record<"chat" | "image" | "audio" | "video", Decimalish>;
  revenue_trend: { date: string; value: Decimalish }[];
  user_growth_trend: { date: string; value: Decimalish }[];
  usage_trend: { date: string; value: Decimalish }[];
  usage_by_model: { model: string; messages: number; tokens: number; credits: Decimalish }[];
  top_users: { user_id: string; email: string; credits: Decimalish; messages: number }[];
}

export interface AdminTransaction {
  id: string;
  user_id: string;
  email: string | null;
  package_name: string | null;
  payment_gateway: string | null;
  amount: Decimalish;
  currency: string | null;
  credits_added: Decimalish;
  status: string;
  created_at: string | null;
  completed_at: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string | null;
  wallet: { credits: Decimalish; updated_at?: string | null } | null;
}

export interface AdminUserPage {
  users: AdminUser[];
  total_count: number;
  page: number;
  size: number;
}

export interface AdminUserUpdate {
  full_name?: string | null;
  is_active?: boolean;
  is_superuser?: boolean;
  credits?: number;
}

/* ── WebSocket protocol v2 ─────────────────────────────────────────────── */

export interface WsSlot {
  slot: number;
  model: string;
  intent: string;
  reason: string;
}

export type WsServerEvent =
  | { type: "system"; event: "ready"; payload: { chat_id: string | null; mode: ChatMode } }
  | { type: "system"; event: "chat_id"; payload: string }
  | { type: "system"; event: "title"; payload: string }
  | { type: "system"; event: "truncated"; payload: string }
  | { type: "system"; event: "stopped"; payload: null }
  | { type: "turn_start"; user_message_id: string; slots: WsSlot[] }
  | { type: "content"; slot: number; delta: string }
  | {
      type: "message_done";
      slot: number;
      message_id: string | null;
      model: string;
      served_model: string | null;
      cost: string;
      prompt_tokens: number;
      completion_tokens: number;
      duration_ms: number;
      finish_reason: string;
      notes: string[];
    }
  | { type: "turn_done"; balance: string }
  | { type: "error"; message: string; code: string; slot: number | null }
  | { type: "pong" };

export interface WsUserMessage {
  type: "user_message";
  content: string;
  attachments: { id: string }[];
  model?: string;
  models?: string[];
  effort: Effort;
  edit_message_id?: string;
}

export interface WsRegenerate {
  type: "regenerate";
  model?: string;
  models?: string[];
  effort: Effort;
}

export type WsClientMessage = WsUserMessage | WsRegenerate | { type: "stop" } | { type: "ping" };
