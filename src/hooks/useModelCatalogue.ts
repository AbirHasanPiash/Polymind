import { useMemo } from "react";
import useSWR from "swr";

import { fetcher } from "../api/client";
import type { ApiModel, Effort, ModelCatalogue } from "../api/types";

/**
 * Shown until the live catalogue arrives, and kept if it never does.
 *
 * The landing page is the one screen that has to render when the API is asleep
 * or unreachable, so it never depends on a request succeeding. Kept short on
 * purpose: the API is the source of truth.
 */
const FALLBACK: ModelCatalogue = {
  models: [
    fallback("gpt-5.5", "openai", "GPT-5.5", "flagship", "OpenAI's flagship: strong reasoning, coding and agentic work.", "200.00", "1200.00"),
    fallback("gpt-5.4-mini", "openai", "GPT-5.4 mini", "fast", "Quick and inexpensive for everyday questions.", "30.00", "180.00"),
    fallback("claude-opus-5", "anthropic", "Claude Opus 5", "flagship", "Deep, careful work: complex coding, analysis and writing.", "200.00", "1000.00"),
    fallback("claude-sonnet-5", "anthropic", "Claude Sonnet 5", "balanced", "The best mix of speed and intelligence.", "80.00", "400.00"),
    fallback("gemini-3.1-pro-preview", "google", "Gemini 3.1 Pro", "flagship", "Google's strongest reasoning model.", "80.00", "480.00", "preview"),
    fallback("gemini-3.8-flash", "google", "Gemini 3.8 Flash", "balanced", "Frontier quality at high speed.", "30.00", "150.00"),
  ],
  providers: [
    { id: "openai", label: "OpenAI", enabled: true },
    { id: "anthropic", label: "Anthropic", enabled: true },
    { id: "google", label: "Google", enabled: true },
  ],
  routing: {
    coding: "claude-opus-5",
    reasoning: "gpt-5.5",
    long_context: "gemini-3.1-pro-preview",
    creative: "claude-sonnet-5",
    fast: "gemini-3.8-flash",
    default: "claude-sonnet-5",
  },
  effort_levels: ["low", "medium", "high"],
  default_effort: "medium",
};

function fallback(
  id: string,
  provider: ApiModel["provider"],
  display_name: string,
  tier: ApiModel["tier"],
  description: string,
  input: string,
  output: string,
  status: ApiModel["status"] = "stable",
): ApiModel {
  return {
    id,
    provider,
    provider_label: provider,
    display_name,
    description,
    tier,
    strengths: [],
    reasoning: true,
    supports_vision: true,
    context_window: 1_000_000,
    max_output_tokens: 128_000,
    status,
    released: "",
    badge: null,
    pricing: { input_credits_per_million: input, output_credits_per_million: output },
  };
}

export type ModelCatalogueState = {
  models: ApiModel[];
  catalogue: ModelCatalogue;
  byId: Map<string, ApiModel>;
  providers: number;
  effortLevels: Effort[];
  isLoading: boolean;
  isFallback: boolean;
};

/**
 * The models the platform can serve, from the public `/models` endpoint.
 *
 * Every caller shares one request: SWR dedupes by key, so the picker, the
 * landing page and the message bubbles do not each fetch the catalogue.
 */
export function useModelCatalogue(): ModelCatalogueState {
  const { data, isLoading } = useSWR<ModelCatalogue>("/models", fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    dedupingInterval: 5 * 60_000,
  });

  return useMemo(() => {
    const catalogue = data?.models?.length ? data : FALLBACK;
    const enabled = new Set(catalogue.providers.filter((p) => p.enabled).map((p) => p.id));
    // Providers without a key are dropped, so the picker never offers a model
    // that would fail with "provider unavailable".
    const models = catalogue.models.filter((m) => enabled.size === 0 || enabled.has(m.provider));
    return {
      models,
      catalogue,
      byId: new Map(models.map((m) => [m.id, m])),
      providers: new Set(models.map((m) => m.provider)).size,
      effortLevels: catalogue.effort_levels,
      isLoading,
      isFallback: !data?.models?.length,
    };
  }, [data, isLoading]);
}
