import { useId } from "react";

/**
 * The product mark: the bolt from `public/favicon.svg`, so the tab icon and the
 * page logo are the same object.
 *
 * The gradient id is generated per instance — two copies of a fixed id in one
 * document is invalid markup, and the second mark would silently reference the
 * first one's gradient.
 */
export function BrandMark({ className }: { className?: string }) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path
        d="M17.5 4 8 18h6.5L13 28l10-14h-6.5L17.5 4z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
