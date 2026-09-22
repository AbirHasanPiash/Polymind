/**
 * Presentation metadata for the model catalogue.
 *
 * The catalogue itself comes from the API; this file only decides how a
 * provider, a tier or an effort level *looks*. Adding a model never touches
 * the client — adding a provider means one entry here.
 */

import type { ApiModel, Effort, Provider, Tier } from "../api/types";

export const AUTO_MODEL = "auto";

export const PROVIDER_META: Record<Provider, { label: string; short: string; color: string; dot: string }> = {
  openai: { label: "OpenAI", short: "GPT", color: "text-openai", dot: "bg-openai" },
  anthropic: { label: "Anthropic", short: "Claude", color: "text-anthropic", dot: "bg-anthropic" },
  google: { label: "Google", short: "Gemini", color: "text-google", dot: "bg-google" },
};

export const PROVIDER_ORDER: Provider[] = ["openai", "anthropic", "google"];

export const TIER_META: Record<Tier, { label: string; hint: string; className: string }> = {
  flagship: { label: "Flagship", hint: "Best quality", className: "bg-accent-soft text-accent" },
  balanced: { label: "Balanced", hint: "Quality and speed", className: "bg-info/10 text-info" },
  fast: { label: "Fast", hint: "Quick and cheap", className: "bg-success/10 text-success" },
};

export const EFFORT_META: Record<Effort, { label: string; hint: string }> = {
  low: { label: "Quick", hint: "Fastest replies, lighter reasoning" },
  medium: { label: "Balanced", hint: "Thinks when it helps" },
  high: { label: "Deep", hint: "Longest reasoning, best on hard problems" },
};

export const INTENT_LABELS: Record<string, string> = {
  coding: "Coding",
  reasoning: "Reasoning",
  long_context: "Long context",
  data: "Data",
  creative: "Writing",
  fast: "Quick reply",
  default: "General",
  pinned: "Pinned",
};

export function providerOf(model: ApiModel | undefined): Provider | undefined {
  return model?.provider;
}

/** "gpt-5.5-2026-04-23" or "claude-opus-5" -> a human name when the catalogue knows it. */
export function displayName(id: string | null | undefined, models: ApiModel[]): string {
  if (!id) return "Assistant";
  if (id === AUTO_MODEL) return "Auto";
  const exact = models.find((m) => m.id === id);
  if (exact) return exact.display_name;
  const prefix = models.find((m) => id.startsWith(m.id));
  if (prefix) return prefix.display_name;
  return prettify(id);
}

/** Turns "claude-opus-5" into "Claude Opus 5" when the catalogue has no entry. */
export function prettify(id: string): string {
  return id
    .replace(/-preview$/, "")
    .replace(/-\d{4}-\d{2}-\d{2}$/, "")
    .split("-")
    .map((part) => (/^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ")
    .replace(/^Gpt/, "GPT");
}

export function guessProvider(id: string | null | undefined): Provider | undefined {
  if (!id) return undefined;
  if (id.startsWith("gpt")) return "openai";
  if (id.startsWith("claude")) return "anthropic";
  if (id.startsWith("gemini")) return "google";
  return undefined;
}

/** "1,048,576" -> "1M", "200000" -> "200K". */
export function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

/** Rough price band from credits per million output tokens: $ · $$ · $$$ · $$$$ */
export function priceBand(model: ApiModel): 1 | 2 | 3 | 4 {
  const out = Number(model.pricing.output_credits_per_million);
  if (out < 200) return 1;
  if (out < 600) return 2;
  if (out < 1500) return 3;
  return 4;
}

export function groupByProvider(models: ApiModel[]): { provider: Provider; models: ApiModel[] }[] {
  return PROVIDER_ORDER.map((provider) => ({
    provider,
    models: models.filter((m) => m.provider === provider),
  })).filter((group) => group.models.length > 0);
}
