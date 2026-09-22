import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CloudOff, Sparkles } from "lucide-react";

import { cn } from "../../lib/utils";
import { Badge, EmptyState, Skeleton } from "../ui/primitives";

/**
 * Shared scaffolding for the media studios.
 *
 * Every studio is the same shape: a generator card, a slim aside with the
 * estimate and tips, then the latest result and a history grid. Keeping the
 * layout here is what makes the three pages read as one product.
 */
export function StudioLayout({ form, aside }: { form: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">{form}</div>
      {aside && <aside className="min-w-0 space-y-4 lg:sticky lg:top-2 lg:self-start">{aside}</aside>}
    </div>
  );
}

export function StudioSection({
  title,
  count,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode;
  count?: number;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-10", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-fg">
            {title}
            {typeof count === "number" && <Badge>{count}</Badge>}
          </h2>
          {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ResultsGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>{children}</div>;
}

/** Highlight wrapper for the item that just finished generating. */
export function JustGenerated({ children, label = "Just generated" }: { children: ReactNode; label?: string }) {
  return (
    <div className="mt-8 animate-rise-in">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-success uppercase">
        <Sparkles className="h-3.5 w-3.5" />
        {label}
      </p>
      <div className="max-w-xl">{children}</div>
    </div>
  );
}

/** Placeholder card shown while the worker is producing an asset. */
export function GeneratingCard({ label, aspect = "square" }: { label: string; aspect?: "square" | "video" | "audio" }) {
  return (
    <div className="surface-card mt-8 max-w-xl overflow-hidden rounded-2xl animate-fade-in" role="status" aria-live="polite">
      <div className={cn("relative animate-shimmer", aspect === "square" ? "aspect-square" : aspect === "video" ? "aspect-video" : "h-20")}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-fg-muted">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-accent" />
          <span className="text-xs font-medium">{label}</span>
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3, aspect = "square" }: { count?: number; aspect?: "square" | "video" | "audio" }) {
  return (
    <ResultsGrid>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface-card overflow-hidden rounded-2xl">
          <Skeleton className={cn("rounded-none", aspect === "square" ? "aspect-square" : aspect === "video" ? "aspect-video" : "h-16")} />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </ResultsGrid>
  );
}

/** Shown when the server has no object storage configured. */
export function StorageDisabled({ what }: { what: string }) {
  return (
    <EmptyState
      icon={<CloudOff className="h-6 w-6" />}
      title="Media storage is not configured"
      description={`Generated ${what} are kept in object storage. Ask the administrator to set the STORAGE_* variables on the server to enable this studio.`}
      action={
        <Link to="/dashboard" className="text-sm font-medium text-accent hover:underline">
          Back to chat
        </Link>
      }
    />
  );
}

/** A short numbered explainer for the aside column. */
export function StudioTips({ title, items }: { title: string; items: { heading: string; body: string }[] }) {
  return (
    <div className="surface-card rounded-2xl p-5">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{title}</p>
      <ol className="mt-3 space-y-3">
        {items.map((item, index) => (
          <li key={item.heading} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-2 font-mono text-[11px] font-semibold text-fg-muted">
              {index + 1}
            </span>
            <span>
              <span className="block text-sm font-medium text-fg">{item.heading}</span>
              <span className="block text-xs leading-relaxed text-fg-muted">{item.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
