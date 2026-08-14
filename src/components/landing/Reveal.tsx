import type { ReactNode } from "react";

import { useReveal } from "../../hooks/useReveal";
import { cn } from "../../lib/utils";

type RevealProps = {
  children: ReactNode;
  /** Stagger, in milliseconds, applied only once the element is in view. */
  delay?: number;
  className?: string;
};

/**
 * Fades and lifts its children into place when they first scroll into view.
 *
 * The delay is applied as `transition-delay` rather than `animation-delay` so a
 * staggered row still settles the moment it is visible — an animation delay
 * would keep the last card invisible for its full stagger even if the user
 * scrolled straight past.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: revealed ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition duration-700 ease-out",
        revealed ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
