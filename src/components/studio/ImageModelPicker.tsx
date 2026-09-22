import { Check, ImagePlus } from "lucide-react";

import type { ImageModelOption } from "../../api/types";
import { cn } from "../../lib/utils";
import { ProviderMark } from "../brand/ProviderMark";
import { Tooltip } from "../ui/overlays";
import { Badge } from "../ui/primitives";

/** Radio-style cards for the image models served by `GET /media/images/options`. */
export function ImageModelPicker({
  models,
  value,
  onChange,
  disabled = false,
}: {
  models: ImageModelOption[];
  value: string | undefined;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Image model" className="grid gap-2 sm:grid-cols-2">
      {models.map((model) => {
        const selected = model.id === value;
        const cheapest = Object.values(model.prices[model.default_quality] ?? {})[0];
        return (
          <button
            key={model.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled || !model.enabled}
            title={model.enabled ? undefined : "Not configured on this server"}
            onClick={() => onChange(model.id)}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
              selected ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong",
            )}
          >
            <ProviderMark provider={model.provider} size="md" className="mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium text-fg">{model.display_name}</span>
                {model.badge && <Badge tone={model.badge === "new" ? "accent" : "warning"}>{model.badge}</Badge>}
                {!model.enabled && <Badge tone="warning">Not configured</Badge>}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xs text-fg-muted">{model.description}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fg-subtle">
                {cheapest && <span className="font-mono">from {Number(cheapest).toFixed(2)} cr</span>}
                {model.supports_reference && (
                  <Tooltip content="Can edit from a reference image">
                    <span className="flex items-center gap-1">
                      <ImagePlus className="h-3 w-3" /> edits
                    </span>
                  </Tooltip>
                )}
                {model.strengths.slice(0, 2).map((strength) => (
                  <span key={strength} className="rounded bg-surface-2 px-1.5 py-0.5">
                    {strength}
                  </span>
                ))}
              </span>
            </span>
            {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
          </button>
        );
      })}
    </div>
  );
}
