import { useId } from "react";

import { cn } from "../../lib/utils";

/**
 * The Polymind mark: three minds (nodes) joined into one — the same drawing as
 * `public/favicon.svg`, so the tab icon and the page logo are one object.
 *
 * The gradient id is generated per instance — two copies of a fixed id in one
 * document is invalid markup, and the second mark would silently reference the
 * first one's gradient.
 */
export function BrandMark({ className }: { className?: string }) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="55%" stopColor="#c026d3" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M10 21.5 16 10.5l6 11" />
        <path d="M10 21.5h12" />
        <path d="M16 10.5v11" />
      </g>
      <g fill="#fff">
        <circle cx="16" cy="10.5" r="2.4" />
        <circle cx="10" cy="21.5" r="2.4" />
        <circle cx="22" cy="21.5" r="2.4" />
        <circle cx="16" cy="21.5" r="1.4" />
      </g>
    </svg>
  );
}

export function Wordmark({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark className={cn("h-8 w-8 shadow-md shadow-accent/20", markClassName)} />
      <span className="text-[17px] font-semibold tracking-tight text-fg">Polymind</span>
    </span>
  );
}
