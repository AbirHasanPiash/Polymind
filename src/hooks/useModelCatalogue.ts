import useSWR from "swr";

import { fetcher } from "../api/client";

export type ApiModel = { id: string; provider: string; description: string };

type ModelsResponse = { models: ApiModel[] };

/**
 * Shown until the live catalogue arrives, and kept if it never does.
 *
 * The landing page is the one screen that has to render when the API is asleep
 * or unreachable, so it never depends on a request succeeding.
 */
const FALLBACK: ApiModel[] = [
  { id: "gpt-5.2-pro", provider: "openai", description: "Deep reasoning and hard analysis" },
  { id: "gpt-5.2", provider: "openai", description: "Balanced general-purpose default" },
  { id: "gpt-5-mini", provider: "openai", description: "Cheapest OpenAI tier" },
  {
    id: "claude-4.5-opus",
    provider: "anthropic",
    description: "Strongest coding and agentic model",
  },
  { id: "claude-4.5-sonnet", provider: "anthropic", description: "Balanced coding model" },
  { id: "claude-4.5-haiku", provider: "anthropic", description: "Fast, low-cost coding model" },
  { id: "gemini-3-pro-preview", provider: "google", description: "Long context, multimodal" },
  { id: "gemini-3-flash-preview", provider: "google", description: "Fastest responses" },
  { id: "gemini-2.5-pro", provider: "google", description: "Large context window" },
  { id: "gemini-2.5-flash", provider: "google", description: "Fast and inexpensive" },
];

/**
 * The models the platform can serve, from the public `/models` endpoint.
 *
 * Every caller shares one request: SWR dedupes by key, so the landing page's
 * counters and its model wall do not each fetch the catalogue.
 */
export function useModelCatalogue() {
  const { data } = useSWR<ModelsResponse>("/models", fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const models = data?.models?.length ? data.models : FALLBACK;
  const providers = new Set(models.map((model) => model.provider)).size;

  return { models, providers };
}
