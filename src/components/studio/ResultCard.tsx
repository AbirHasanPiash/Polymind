import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";

import { cn } from "../../lib/utils";
import { Tooltip } from "../ui/overlays";

/**
 * The card every studio uses for a generated asset: a media area on top, a
 * meta line, the prompt, and a row of actions. The delete control floats over
 * the media so it is reachable on touch without crowding the footer.
 */
export function ResultCard({
  media,
  header,
  body,
  footer,
  onDelete,
  highlighted = false,
  className,
}: {
  media: ReactNode;
  header?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  onDelete?: () => void;
  highlighted?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group surface-card relative flex flex-col overflow-hidden rounded-2xl transition hover:border-line-strong",
        highlighted && "ring-2 ring-accent/40",
        className,
      )}
    >
      <div className="relative">
        {media}
        {onDelete && (
          <Tooltip content="Delete">
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete"
              className={cn(
                "absolute top-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-canvas/85 text-fg-muted shadow-sm backdrop-blur hover:bg-danger hover:text-white",
                "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {header && <div className="flex flex-wrap items-center gap-1.5 text-xs">{header}</div>}
        {body}
        {footer && <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">{footer}</div>}
      </div>
    </article>
  );
}

/** Small round icon button used in card footers. */
export function CardAction({
  label,
  onClick,
  children,
  disabled = false,
  busy = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        aria-label={label}
        aria-busy={busy || undefined}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40"
      >
        {children}
      </button>
    </Tooltip>
  );
}
