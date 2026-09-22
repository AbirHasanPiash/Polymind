import { useMemo, useState } from "react";
import { Check, ChevronDown, Mic2, Search } from "lucide-react";

import type { Provider, Voice } from "../../api/types";
import { PROVIDER_META, PROVIDER_ORDER } from "../../lib/models";
import { cn } from "../../lib/utils";
import { ProviderMark } from "../brand/ProviderMark";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/overlays";
import { Badge } from "../ui/primitives";

/**
 * Voice chooser shared by the Voice and Avatar studios.
 *
 * The list is the catalogue served by `GET /media/voices`, grouped by provider
 * and priced per thousand characters, so adding a voice on the server is all
 * it takes to see it here.
 */
export function VoicePicker({
  voices,
  value,
  onChange,
  disabled = false,
}: {
  voices: Voice[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = voices.find((voice) => voice.id === value);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = voices.filter(
      (voice) => !q || `${voice.name} ${voice.description} ${voice.language} ${voice.gender} ${voice.provider}`.toLowerCase().includes(q),
    );
    return PROVIDER_ORDER.map((provider) => ({ provider, voices: filtered.filter((voice) => voice.provider === provider) })).filter(
      (group) => group.voices.length > 0,
    );
  }, [voices, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Choose voice"
          className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-line bg-surface-2/60 px-3 text-left text-sm text-fg hover:border-line-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-50"
        >
          {selected ? (
            <>
              <ProviderMark provider={selected.provider} size="sm" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{selected.name}</span>
                <span className="text-fg-muted"> · {selected.description}</span>
              </span>
              {selected.tier === "premium" && <Badge tone="accent">Studio</Badge>}
            </>
          ) : (
            <>
              <Mic2 className="h-4 w-4 text-fg-subtle" />
              <span className="flex-1 text-fg-subtle">Choose a voice</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-fg-subtle" />
        </button>
      </PopoverTrigger>

      <PopoverContent side="bottom" align="start" className="w-[min(94vw,26rem)] p-0">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search voices…"
            aria-label="Search voices"
            className="h-11 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
        </div>
        <div role="listbox" className="custom-scrollbar max-h-[50vh] overflow-y-auto p-1.5">
          {groups.length === 0 && <p className="px-3 py-6 text-center text-sm text-fg-muted">No voices match.</p>}
          {groups.map((group) => (
            <div key={group.provider}>
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
                {PROVIDER_META[group.provider as Provider].label}
              </p>
              {group.voices.map((voice) => {
                const active = voice.id === value;
                return (
                  <button
                    key={voice.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={!voice.enabled}
                    title={voice.enabled ? undefined : "Not configured on this server"}
                    onClick={() => {
                      onChange(voice.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40",
                      active && "bg-accent-soft",
                    )}
                  >
                    <ProviderMark provider={voice.provider} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-fg">{voice.name}</span>
                        <span className="text-xs text-fg-subtle capitalize">{voice.gender}</span>
                        {voice.tier === "premium" && <Badge tone="accent">Studio</Badge>}
                        {!voice.enabled && <Badge tone="warning">Not configured</Badge>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-fg-muted">
                        {voice.description} · {voice.language}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {active && <Check className="h-4 w-4 text-accent" />}
                      <span className="font-mono text-[11px] text-fg-subtle">{Number(voice.credits_per_1k_chars).toFixed(2)} cr/1k</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
