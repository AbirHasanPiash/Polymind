import { useModelCatalogue } from "../../hooks/useModelCatalogue";
import { cn } from "../../lib/utils";

const PROVIDER_DOT: Record<string, string> = {
  openai: "bg-emerald-400",
  anthropic: "bg-orange-400",
  google: "bg-sky-400",
};

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
              className="landing-panel flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 backdrop-blur-sm"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  PROVIDER_DOT[model.provider] ?? "bg-slate-400",
                )}
              />
              <span className="font-mono text-[13px] font-medium text-slate-800 dark:text-slate-100">
                {model.id}
              </span>
              <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
                {model.description}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
