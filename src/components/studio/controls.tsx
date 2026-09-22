import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

/** Wrapping chip group for enumerated options such as quality or size. */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  hint,
  disabled = false,
}: {
  label: ReactNode;
  options: { value: T; label: string; hint?: string; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{label}</span>
        {hint && <span className="text-[11px] text-fg-subtle">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.hint}
              disabled={disabled || option.disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "h-9 rounded-lg border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40",
                selected ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "123 / 4096" counter that turns red near the limit. */
export function CharCount({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? value / max : 0;
  return (
    <span
      className={cn(
        "font-mono text-[11px] tabular-nums",
        ratio >= 1 ? "text-danger" : ratio > 0.9 ? "text-warning" : "text-fg-subtle",
      )}
      aria-live="polite"
    >
      {value.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}

/** Uppercase eyebrow used above a control group inside the generator card. */
export function ControlLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
      {children}
    </label>
  );
}
