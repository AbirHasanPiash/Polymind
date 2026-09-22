import { cn } from "../lib/utils";

type LoadingProps = {
  /** `screen` fills the viewport; `inline` fills whatever container it is in. */
  variant?: "screen" | "inline";
  label?: string;
};

export default function Loading({ variant = "screen", label = "Loading" }: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-4 animate-fade-in",
        variant === "screen" ? "h-dvh bg-canvas" : "min-h-[50vh] flex-1",
      )}
    >
      <div className="relative h-11 w-11">
        <div className="absolute inset-0 rounded-full border-2 border-line" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent border-r-brand-3" />
        <div className="absolute inset-[32%] rounded-full bg-brand-gradient opacity-90" />
      </div>
      <p className="text-xs font-medium tracking-wide text-fg-muted">
        {label}
        <span className="sr-only">, please wait</span>
      </p>
    </div>
  );
}
