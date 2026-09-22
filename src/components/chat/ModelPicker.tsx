import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Check, ChevronDown, Columns2, Eye, Search, Sparkles, X } from "lucide-react";

import type { ApiModel, Tier } from "../../api/types";
import { useModelCatalogue } from "../../hooks/useModelCatalogue";
import { AUTO_MODEL, PROVIDER_META, TIER_META, formatContext, groupByProvider, priceBand } from "../../lib/models";
import { readJson, writeJson } from "../../lib/storage";
import { cn } from "../../lib/utils";
import { ProviderMark } from "../brand/ProviderMark";
import { Popover, PopoverContent, PopoverTrigger, Tooltip } from "../ui/overlays";
import { Badge, Segmented } from "../ui/primitives";
import type { ModelSelection } from "./types";

const RECENT_KEY = "recent-models";
const MAX_RECENT = 3;
const ARENA_MAX = 3;

type TierFilter = "all" | Tier;

/**
 * The model picker, living inside the composer.
 *
 * One click opens it, one click chooses: search, tier filters and keyboard
 * navigation for anyone who wants them, "Auto" at the top for everyone else.
 * Every entry comes from the catalogue the API serves, so adding a model to
 * the backend registry is all it takes to see it here.
 *
 * "Compare" turns the same list into a multi-select for arena mode.
 */
export function ModelPicker({
  selection,
  onChange,
  disabled = false,
  allowArena = true,
  compact = false,
}: {
  selection: ModelSelection;
  onChange: (selection: ModelSelection) => void;
  disabled?: boolean;
  allowArena?: boolean;
  compact?: boolean;
}) {
  const { models, byId, isFallback } = useModelCatalogue();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<TierFilter>("all");
  const [cursor, setCursor] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => readJson<string[]>(RECENT_KEY, []));
  const listRef = useRef<HTMLDivElement>(null);
  const isArena = selection.mode === "arena";

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery("");
      setTier("all");
      setCursor(0);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((model) => {
      if (tier !== "all" && model.tier !== tier) return false;
      if (!q) return true;
      return `${model.display_name} ${model.id} ${model.provider_label} ${model.description} ${model.strengths.join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [models, query, tier]);

  const recentModels = useMemo(
    () => (query ? [] : recent.map((id) => byId.get(id)).filter((m): m is ApiModel => Boolean(m))),
    [recent, byId, query],
  );

  // Flat, ordered list for keyboard navigation: auto, recent, then groups.
  const ordered = useMemo(() => {
    const ids: string[] = [];
    if (!query && !isArena) ids.push(AUTO_MODEL);
    for (const model of recentModels) ids.push(model.id);
    for (const group of groupByProvider(visible)) for (const model of group.models) ids.push(model.id);
    return ids;
  }, [query, isArena, recentModels, visible]);

  // The list shrinks when filtering, so the cursor is clamped rather than reset.
  const cursorIndex = Math.min(cursor, Math.max(ordered.length - 1, 0));
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-model="${ordered[cursorIndex]}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursorIndex, ordered]);

  const remember = (id: string) => {
    if (id === AUTO_MODEL) return;
    const next = [id, ...recent.filter((r) => r !== id)].slice(0, MAX_RECENT);
    setRecent(next);
    writeJson(RECENT_KEY, next);
  };

  const choose = (id: string) => {
    if (isArena) {
      const current = selection.models;
      const next = current.includes(id) ? current.filter((m) => m !== id) : [...current, id].slice(-ARENA_MAX);
      onChange({ mode: "arena", models: next });
      remember(id);
      return;
    }
    onChange({ mode: "single", model: id });
    remember(id);
    setOpen(false);
  };

  const toggleArena = () => {
    if (isArena) {
      onChange({ mode: "single", model: selection.models[0] ?? AUTO_MODEL });
    } else {
      const first = selection.model !== AUTO_MODEL ? selection.model : (models[0]?.id ?? "");
      const second = models.find((m) => m.id !== first && m.provider !== byId.get(first)?.provider)?.id ?? models.find((m) => m.id !== first)?.id;
      onChange({ mode: "arena", models: [first, second].filter((m): m is string => Boolean(m)) });
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, ordered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const id = ordered[cursorIndex];
      if (id) choose(id);
    }
  };

  const isSelected = (id: string) => (isArena ? selection.models.includes(id) : selection.model === id);

  const renderRow = (model: ApiModel, index: number) => {
    const selected = isSelected(model.id);
    const band = priceBand(model);
    return (
      <button
        key={model.id}
        type="button"
        role="option"
        aria-selected={selected}
        data-model={model.id}
        onMouseEnter={() => setCursor(index)}
        onClick={() => choose(model.id)}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left",
          index === cursorIndex ? "bg-surface-2" : "",
          selected && "bg-accent-soft",
        )}
      >
        <ProviderMark provider={model.provider} size="md" className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-fg">{model.display_name}</span>
            {model.badge && <Badge tone={model.badge === "new" ? "accent" : "warning"}>{model.badge}</Badge>}
            <Badge className={TIER_META[model.tier].className}>{TIER_META[model.tier].label}</Badge>
          </span>
          <span className="mt-0.5 block truncate text-xs text-fg-muted">{model.description}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5 text-[11px] text-fg-subtle">
          <span className="flex items-center gap-1.5">
            {model.reasoning && (
              <Tooltip content="Adjustable reasoning depth">
                <Brain className="h-3.5 w-3.5" />
              </Tooltip>
            )}
            {model.supports_vision && (
              <Tooltip content="Understands images">
                <Eye className="h-3.5 w-3.5" />
              </Tooltip>
            )}
            {selected && <Check className="h-4 w-4 text-accent" />}
          </span>
          <span className="font-mono">
            {formatContext(model.context_window)} · <span className="text-fg-muted">{"$".repeat(band)}</span>
            <span className="opacity-40">{"$".repeat(4 - band)}</span>
          </span>
        </span>
      </button>
    );
  };

  let index = !query && !isArena ? 1 : 0;
  const groups = groupByProvider(visible);
  const label = isArena
    ? selection.models.length === 0
      ? "Pick models"
      : selection.models.map((id) => byId.get(id)?.display_name ?? id).join(" · ")
    : selection.model === AUTO_MODEL
      ? "Auto"
      : (byId.get(selection.model)?.display_name ?? selection.model);
  const provider = !isArena && selection.model !== AUTO_MODEL ? byId.get(selection.model)?.provider : undefined;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Choose model"
          className={cn(
            "flex h-8 max-w-[60vw] items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-xs font-medium text-fg hover:border-line-strong hover:bg-surface-2 disabled:opacity-50 sm:max-w-xs",
            isArena && "border-brand-3/40 bg-brand-3/5",
          )}
        >
          {isArena ? (
            <Columns2 className="h-3.5 w-3.5 shrink-0 text-brand-3" />
          ) : selection.model === AUTO_MODEL ? (
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
          ) : (
            <ProviderMark provider={provider} size="xs" />
          )}
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
        </button>
      </PopoverTrigger>

      <PopoverContent side="top" align="start" className={cn("w-[min(94vw,27rem)] p-0", compact && "w-[min(94vw,24rem)]")}>
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search models…"
            aria-label="Search models"
            className="h-11 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="rounded p-1 text-fg-subtle hover:text-fg" aria-label="Clear search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <Segmented<TierFilter>
            aria-label="Filter by tier"
            value={tier}
            onChange={(next) => {
              setTier(next);
              setCursor(0);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "flagship", label: "Flagship" },
              { value: "balanced", label: "Balanced" },
              { value: "fast", label: "Fast" },
            ]}
          />
          {allowArena && (
            <button
              type="button"
              onClick={toggleArena}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium",
                isArena ? "bg-brand-3/15 text-brand-3" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Columns2 className="h-3.5 w-3.5" />
              Compare
            </button>
          )}
        </div>

        <div ref={listRef} role="listbox" className="custom-scrollbar max-h-[52vh] space-y-1 overflow-y-auto px-1.5 pb-1.5">
          {!query && !isArena && (
            <button
              type="button"
              role="option"
              aria-selected={selection.model === AUTO_MODEL}
              data-model={AUTO_MODEL}
              onMouseEnter={() => setCursor(0)}
              onClick={() => choose(AUTO_MODEL)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left",
                cursorIndex === 0 && "bg-surface-2",
                selection.model === AUTO_MODEL && "bg-accent-soft",
              )}
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-gradient text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-sm font-medium text-fg">Auto</span>
                <span className="mt-0.5 block text-xs text-fg-muted">
                  Reads the intent of each message and picks the best model for it.
                </span>
              </span>
              {selection.model === AUTO_MODEL && <Check className="mt-1 h-4 w-4 shrink-0 text-accent" />}
            </button>
          )}
          {recentModels.length > 0 && (
            <div>
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Recent</p>
              {recentModels.map((model) => renderRow(model, index++))}
            </div>
          )}

          {groups.map((group) => (
            <div key={group.provider}>
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
                {PROVIDER_META[group.provider].label}
              </p>
              {group.models.map((model) => renderRow(model, index++))}
            </div>
          ))}

          {visible.length === 0 && <p className="px-3 py-6 text-center text-sm text-fg-muted">No models match.</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-[11px] text-fg-subtle">
          <span>
            {isArena
              ? `${selection.models.length}/${ARENA_MAX} selected · replies stream side by side`
              : isFallback
                ? "Catalogue unavailable — showing defaults"
                : "$ = cost per reply · context window shown"}
          </span>
          {isArena && (
            <button
              type="button"
              disabled={selection.models.length < 2}
              onClick={() => setOpen(false)}
              className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-accent-fg disabled:opacity-50"
            >
              Done
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
