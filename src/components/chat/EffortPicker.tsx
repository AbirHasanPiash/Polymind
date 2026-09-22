import { Gauge } from "lucide-react";

import type { Effort } from "../../api/types";
import { EFFORT_META } from "../../lib/models";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/overlays";

/** Reasoning depth for the next reply: Quick, Balanced or Deep. */
export function EffortPicker({
  value,
  onChange,
  levels,
  disabled = false,
}: {
  value: Effort;
  onChange: (value: Effort) => void;
  levels: Effort[];
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Reasoning depth"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-xs font-medium text-fg hover:border-line-strong hover:bg-surface-2 disabled:opacity-50"
        >
          <Gauge className="h-3.5 w-3.5 text-fg-muted" />
          <span className="hidden sm:inline">{EFFORT_META[value].label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-1.5">
        <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Reasoning depth</p>
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={cn(
              "flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left hover:bg-surface-2",
              value === level && "bg-accent-soft",
            )}
          >
            <span className="text-sm font-medium text-fg">{EFFORT_META[level].label}</span>
            <span className="text-xs text-fg-muted">{EFFORT_META[level].hint}</span>
          </button>
        ))}
        <p className="px-2.5 pt-2 pb-1 text-[11px] text-fg-subtle">Deeper reasoning uses more output tokens.</p>
      </PopoverContent>
    </Popover>
  );
}
