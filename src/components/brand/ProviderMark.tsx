import type { Provider } from "../../api/types";
import { PROVIDER_META } from "../../lib/models";
import { cn } from "../../lib/utils";

/**
 * A small monogram per provider. Drawn rather than pulled from a CDN so it
 * works offline, follows the theme, and never trips a brand-asset policy.
 */
export function ProviderMark({
  provider,
  className,
  size = "md",
}: {
  provider: Provider | undefined;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const sizes = { xs: "h-4 w-4 text-[8px]", sm: "h-5 w-5 text-[9px]", md: "h-7 w-7 text-[11px]", lg: "h-9 w-9 text-sm" };
  const meta = provider ? PROVIDER_META[provider] : undefined;
  const label = provider === "openai" ? "G" : provider === "anthropic" ? "A" : provider === "google" ? "✦" : "?";
  const tone =
    provider === "openai"
      ? "bg-openai/15 text-openai"
      : provider === "anthropic"
        ? "bg-anthropic/15 text-anthropic"
        : provider === "google"
          ? "bg-google/15 text-google"
          : "bg-surface-2 text-fg-muted";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md font-bold", sizes[size], tone, className)}
      title={meta?.label}
      aria-label={meta?.label}
    >
      {label}
    </span>
  );
}

export function ProviderDot({ provider, className }: { provider: Provider | undefined; className?: string }) {
  const dot = provider ? PROVIDER_META[provider].dot : "bg-fg-subtle";
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", dot, className)} aria-hidden="true" />;
}
