import { cn } from "../lib/utils";

type LoadingProps = {
  /** `screen` fills the viewport; `inline` fills whatever container it is in. */
  variant?: "screen" | "inline";
  label?: string;
};

/**
 * Loading indicator.
 *
 * Deliberately light: two composited rings and a fade. The previous version ran
 * eleven simultaneous animations (spinning rings, ping rings, orbiting dots,
 * pulsing letters), which is a lot of continuous compositing for something that
 * often appears for a few hundred milliseconds — and on a slow device it made
 * the very moment the app should feel fastest feel busy.
 */
export default function Loading({ variant = "screen", label = "Loading" }: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-4 animate-fade-in",
        variant === "screen" ? "h-screen app-surface" : "min-h-[50vh] flex-1",
      )}
    >
      <div className="relative h-12 w-12">
        {/* Track */}
        <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-white/10" />
        {/* Rotating arc: transform only, so it never triggers layout. */}
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500 border-r-purple-500" />
        <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-80" />
      </div>

      <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-gray-400">
        {label}
        <span className="sr-only">, please wait</span>
      </p>
    </div>
  );
}
