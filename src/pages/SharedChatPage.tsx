import { Link, useParams } from "react-router-dom";
import useSWR from "swr";
import { ArrowRight, Columns2 } from "lucide-react";

import { fetcher } from "../api/client";
import type { SharedChat } from "../api/types";
import { BrandMark, Wordmark } from "../components/brand/BrandMark";
import { ProviderMark } from "../components/brand/ProviderMark";
import { Markdown } from "../components/chat/Markdown";
import { ThemeToggle } from "../components/layout/ThemeToggle";
import { Badge, EmptyState, Skeleton } from "../components/ui/primitives";
import { useAuth } from "../context/auth-context";
import { useModelCatalogue } from "../hooks/useModelCatalogue";
import { formatDate } from "../lib/format";
import { displayName, guessProvider } from "../lib/models";

/** Public, read-only view of a shared conversation. */
export default function SharedChatPage() {
  const { token } = useParams();
  const { isAuthenticated } = useAuth();
  const { models } = useModelCatalogue();
  const { data, error, isLoading } = useSWR<SharedChat>(token ? `/chat/shared/${token}` : null, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to={isAuthenticated ? "/dashboard" : "/signup"}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-semibold text-accent-fg hover:bg-accent-strong"
            >
              {isAuthenticated ? "Open Polymind" : "Try Polymind"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {error && (
          <EmptyState
            icon={<BrandMark className="h-8 w-8" />}
            title="This link is no longer active"
            description="The owner may have disabled sharing for this conversation."
            action={
              <Link to="/" className="text-sm font-medium text-accent hover:underline">
                Go to Polymind
              </Link>
            }
          />
        )}
        {data && (
          <>
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{data.title ?? "Shared conversation"}</h1>
                {data.mode === "arena" && (
                  <Badge className="bg-brand-3/15 text-brand-3">
                    <Columns2 className="h-3 w-3" /> Arena
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-fg-muted">Shared from Polymind · {formatDate(data.shared_at ?? data.created_at)}</p>
            </div>

            <div className="space-y-6">
              {data.messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-soft px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</div>
                  </div>
                ) : (
                  <div key={message.id}>
                    <div className="mb-1.5 flex items-center gap-2 px-1">
                      <ProviderMark provider={models.find((m) => m.id === message.model)?.provider ?? guessProvider(message.model)} size="sm" />
                      <span className="text-xs font-semibold">{displayName(message.model, models)}</span>
                    </div>
                    <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3.5 sm:px-5">
                      <Markdown content={message.content} />
                    </div>
                  </div>
                ),
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
