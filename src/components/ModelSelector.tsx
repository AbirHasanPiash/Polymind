import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, CpuChipIcon, SparklesIcon } from "@heroicons/react/24/solid";
import useSWRImmutable from "swr/immutable";

import { fetcher } from "../api/client";
import { cn } from "../lib/utils";

type ApiModel = {
  id: string;
  provider: string;
  description: string;
};

type ModelSelectorProps = {
  model: string;
  setModel: (value: string) => void;
};

const AUTO = "auto";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
};

/** Fallback if the catalogue cannot be loaded, so the picker is never empty. */
const FALLBACK_MODELS: ApiModel[] = [
  { id: "gpt-5.2", provider: "openai", description: "Balanced default" },
  { id: "claude-4.5-sonnet", provider: "anthropic", description: "Balanced coding model" },
  { id: "gemini-2.5-flash", provider: "google", description: "Fast and inexpensive" },
];

/** Turns "claude-4.5-sonnet" into "Claude 4.5 Sonnet". */
function prettify(id: string): string {
  return id
    .replace(/-preview$/, "")
    .split("-")
    .map((part) => (/^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ")
    .replace(/^Gpt/, "GPT");
}

export default function ModelSelector({ model, setModel }: ModelSelectorProps) {
  // The catalogue comes from GET /api/v1/models, so the list can never drift
  // from what the backend actually accepts. Immutable: it changes on deploy.
  const { data } = useSWRImmutable<{ models: ApiModel[] }>("/models", fetcher);
  const models = data?.models ?? FALLBACK_MODELS;

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Derived, not duplicated in state: a separate `isSmartMode` flag could drift
  // out of sync with the actual selection.
  const isAuto = model === AUTO;

  const grouped = useMemo(() => {
    const groups = new Map<string, ApiModel[]>();
    for (const entry of models) {
      const list = groups.get(entry.provider) ?? [];
      list.push(entry);
      groups.set(entry.provider, list);
    }
    return [...groups.entries()];
  }, [models]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  const currentLabel = isAuto ? "Smart select" : prettify(model);

  return (
    <div
      ref={dropdownRef}
      className={cn(
        "relative w-full rounded-xl border bg-white p-2 dark:bg-[#1a1d26]",
        isAuto
          ? "border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.25)]"
          : "border-slate-200 dark:border-blue-500/20",
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <button
          type="button"
          role="switch"
          aria-checked={isAuto}
          onClick={() => {
            setModel(isAuto ? models[0]?.id ?? AUTO : AUTO);
            setIsOpen(false);
          }}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full",
            isAuto ? "bg-blue-600" : "bg-slate-300 dark:bg-gray-700",
          )}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200",
              isAuto ? "translate-x-[1.3rem]" : "translate-x-[0.125rem]",
            )}
          />
        </button>

        <span className="flex items-center gap-1.5">
          <SparklesIcon
            className={cn(
              "h-3.5 w-3.5",
              isAuto ? "text-blue-500 dark:text-blue-400" : "text-slate-400 dark:text-gray-500",
            )}
          />
          <span
            className={cn(
              "text-xs font-semibold",
              isAuto ? "text-slate-700 dark:text-gray-200" : "text-slate-400 dark:text-gray-400",
            )}
          >
            Smart select
          </span>
        </span>
      </div>

      <div className="relative">
        {isAuto ? (
          <div className="flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 dark:border-blue-500/30 dark:bg-[#1a1d26]">
            <SparklesIcon className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
            <p className="truncate text-xs font-medium text-blue-700 dark:text-gray-300">
              The router picks the best model
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-slate-700 shadow-sm hover:border-blue-400 dark:border-gray-700/50 dark:bg-[#1a1d26] dark:text-gray-200 dark:hover:border-blue-500/50"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <CpuChipIcon className="h-3.5 w-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
              <span className="truncate text-xs font-semibold">{currentLabel}</span>
            </span>
            <ChevronDownIcon
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-gray-400",
                isOpen && "rotate-180",
              )}
            />
          </button>
        )}

        {isOpen && !isAuto && (
          <div
            role="listbox"
            className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl animate-scale-in dark:border-gray-700/50 dark:bg-[#1a1d26]"
          >
            <div className="custom-scrollbar max-h-[220px] overflow-y-auto">
              {grouped.map(([provider, entries], index) => (
                <div key={provider}>
                  {index > 0 && <div className="mx-2 h-px bg-slate-100 dark:bg-gray-700/30" />}
                  <div className="px-2 py-2">
                    <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                      {PROVIDER_LABELS[provider] ?? provider}
                    </div>
                    <div className="space-y-0.5">
                      {entries.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          role="option"
                          aria-selected={model === entry.id}
                          title={entry.description}
                          onClick={() => {
                            setModel(entry.id);
                            setIsOpen(false);
                          }}
                          className={cn(
                            "w-full rounded-md border px-2 py-1.5 text-left text-xs",
                            model === entry.id
                              ? "border-blue-200 bg-blue-50 font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-600/20 dark:text-blue-100"
                              : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-[#252833] dark:hover:text-white",
                          )}
                        >
                          {prettify(entry.id)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
