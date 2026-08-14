import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "../../lib/utils";
import { ModeToggle } from "../mode-toggle";
import { BrandMark } from "./BrandMark";

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
 * Condensing takes two things, and it needs both: the pill gains a nearly
 * opaque surface, and a masked veil covers the full width of the strip. The
 * pill alone is not enough — it is centred and capped at 6xl, so on a wide
 * screen the page would scroll past in plain view on either side of it.
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
        className={cn(
          "landing-nav-scrim absolute inset-x-0 top-0 h-32 transition-opacity duration-300",
          condensed ? "opacity-100" : "opacity-0",
        )}
      />

      <div className="relative px-3 pt-3 sm:px-6 sm:pt-4">
        <nav
          aria-label="Main"
          className={cn(
            "pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl px-3 transition duration-300 sm:h-16 sm:px-4",
            condensed
              ? "landing-nav shadow-[0_8px_32px_-16px_rgb(15_23_42_/_0.35)] backdrop-blur-xl dark:shadow-[0_8px_32px_-16px_rgb(0_0_0_/_0.8)]"
              : "border border-transparent",
          )}
        >
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-xl focus-visible:outline-offset-4"
          >
            <BrandMark className="h-8 w-8 shadow-lg shadow-blue-500/20 sm:h-9 sm:w-9" />
            <span className="text-[15px] font-semibold tracking-tight text-slate-900 sm:text-base dark:text-white">
              MultiAIModel
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {SECTIONS.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                {section.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ModeToggle />

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="group inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:shadow-white/10 dark:hover:bg-slate-100"
              >
                Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden h-10 items-center rounded-xl px-3 text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline-flex dark:text-slate-400 dark:hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:shadow-white/10 dark:hover:bg-slate-100"
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
