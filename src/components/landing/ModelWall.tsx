import { useModelCatalogue } from "../../hooks/useModelCatalogue";
import { TIER_META } from "../../lib/models";
import { cn } from "../../lib/utils";
import { ProviderDot } from "../brand/ProviderMark";
import { Badge } from "../ui/primitives";

/**
 * Scrolling wall of every model the platform can serve.
 *
 * The list comes from the same registry the router and the biller read, so this
 * page cannot advertise a model the backend would reject.
 */
export function ModelWall() {
  const { models } = useModelCatalogue();

  const half = Math.ceil(models.length / 2);
  const rows = [models.slice(0, half), models.slice(half)].filter((row) => row.length > 0);

  return (
    <div className="mask-edges-x space-y-3 overflow-hidden">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            "flex w-max gap-3 hover:[animation-play-state:paused]",
            rowIndex % 2 === 0 ? "animate-marquee" : "animate-marquee-reverse",
          )}
        >
          {/* Two copies: the track is translated by exactly half its width, so
              the second copy is under the pointer when the first wraps. */}
          {[...row, ...row].map((model, copyIndex) => (
            <div
              key={`${model.id}-${copyIndex}`}
              className="surface-card flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5"
            >
              <ProviderDot provider={model.provider} />
              <span className="text-[13px] font-semibold text-fg">{model.display_name}</span>
              <Badge className={TIER_META[model.tier].className}>{TIER_META[model.tier].label}</Badge>
              {model.badge && <Badge tone={model.badge === "new" ? "accent" : "warning"}>{model.badge}</Badge>}
              <span className="hidden max-w-[16rem] truncate text-xs text-fg-muted sm:inline">
                {model.description}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
