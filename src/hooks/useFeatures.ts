import useSWR from "swr";

import { fetcher } from "../api/client";
import type { Features } from "../api/types";

const OPTIMISTIC: Features = {
  google_login: true,
  openai: true,
  anthropic: true,
  google: true,
  avatar_video: true,
  storage: true,
  stripe: true,
  razorpay: true,
  password_reset: true,
};

/** Which optional integrations the backend has configured. */
export function useFeatures(): { features: Features; isLoading: boolean } {
  const { data, isLoading } = useSWR<{ features: Features }>("/features", fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    dedupingInterval: 10 * 60_000,
  });
  return { features: data?.features ?? OPTIMISTIC, isLoading };
}
