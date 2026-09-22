import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "../../lib/utils";
import { Wordmark } from "../brand/BrandMark";
import { ThemeToggle } from "../layout/ThemeToggle";

const SECTIONS = [
  { href: "#studios", label: "Studios" },
  { href: "#routing", label: "Routing" },
  { href: "#models", label: "Models" },
  { href: "#credits", label: "Credits" },
];

/**
 * Floating navigation bar.
 *
 * It starts transparent over the hero and condenses once the page scrolls, so
 * the first screen reads as one uninterrupted surface instead of being cut
 * across by a header. The page owns the `condensed` flag — see `useScrolledPast`
 * for why it is not read from `window.scrollY` here.
 *
 * Condensing takes two things: the pill gains a glass surface, and a masked
 * veil covers the full width of the strip so content cannot scroll past in
 * plain view on either side of the centred pill.
 */
export function LandingNav({
  isAuthenticated,
  condensed,
}: {
  isAuthenticated: boolean;
  condensed: boolean;
}) {
  return (
    // The bar takes no pointer events itself: it spans the full width, and the
    // empty space beside the pill must not swallow clicks on the page below.
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div
        aria-hidden="true"
        style={{ maskImage: "linear-gradient(to bottom, #000 62%, transparent)" }}
        className={cn(
          "absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-canvas via-canvas/90 to-transparent backdrop-blur-md transition-opacity duration-300",
          condensed ? "opacity-100" : "opacity-0",
        )}
      />

      <div className="relative px-3 pt-3 sm:px-6 sm:pt-4">
        <nav
          aria-label="Main"
          className={cn(
            "pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl px-3 transition duration-300 sm:h-16 sm:px-4",
            condensed ? "glass border border-line shadow-pop" : "border border-transparent",
          )}
        >
          <Link to="/" className="rounded-xl focus-visible:outline-offset-4">
            <Wordmark />
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {SECTIONS.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg"
              >
                {section.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="group inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg shadow-sm hover:bg-accent-strong active:scale-[0.98]"
              >
                Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden h-10 items-center rounded-xl px-3 text-sm font-medium text-fg-muted hover:text-fg sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg shadow-sm hover:bg-accent-strong active:scale-[0.98]"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
