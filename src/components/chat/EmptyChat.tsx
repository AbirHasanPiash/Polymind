import { Code2, Columns2, FileSearch, Lightbulb, PenLine, Sparkles } from "lucide-react";

import { useModelCatalogue } from "../../hooks/useModelCatalogue";
import { cn } from "../../lib/utils";
import { BrandMark } from "../brand/BrandMark";
import { ProviderMark } from "../brand/ProviderMark";

const SUGGESTIONS = [
  { icon: Code2, title: "Debug this stack trace", prompt: "Here is a stack trace from my app. Explain the root cause and suggest a fix:\n\n", tone: "text-openai" },
  { icon: PenLine, title: "Rewrite for clarity", prompt: "Rewrite the following so it is clearer and half as long, keeping the meaning:\n\n", tone: "text-brand-3" },
  { icon: FileSearch, title: "Summarise a document", prompt: "Summarise the attached document into 8 bullet points, then list open questions.", tone: "text-google" },
  { icon: Lightbulb, title: "Brainstorm ideas", prompt: "Give me 10 unconventional ideas for ", tone: "text-warning" },
];

export function EmptyChat({
  name,
  arena,
  onPick,
  onCompare,
}: {
  name: string | null | undefined;
  arena: boolean;
  onPick: (prompt: string) => void;
  onCompare: () => void;
}) {
  const { models } = useModelCatalogue();
  const highlights = models.filter((m) => m.tier === "flagship").slice(0, 3);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = name?.split(" ")[0];

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-2 py-8 text-center animate-fade-in">
      <BrandMark className="mb-5 h-14 w-14 shadow-lg shadow-accent/25" />
      <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
        {greeting}
        {first ? `, ${first}` : ""}.
      </h2>
      <p className="mt-2 max-w-md text-[15px] text-fg-muted">
        {arena
          ? "Arena mode: pick two or three models below and every reply streams side by side."
          : "Ask anything. Auto picks the best model for each message, or choose one yourself from the composer."}
      </p>

      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => onPick(item.prompt)}
            className="surface-card flex items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-line-strong"
          >
            <item.icon className={cn("h-4.5 w-4.5 shrink-0", item.tone)} />
            <span className="text-sm font-medium text-fg">{item.title}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Frontier models on tap:
        </span>
        {highlights.map((model) => (
          <span key={model.id} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1">
            <ProviderMark provider={model.provider} size="xs" />
            {model.display_name}
          </span>
        ))}
        {!arena && (
          <button type="button" onClick={onCompare} className="flex items-center gap-1.5 rounded-full border border-brand-3/40 bg-brand-3/5 px-2.5 py-1 font-medium text-brand-3 hover:bg-brand-3/10">
            <Columns2 className="h-3.5 w-3.5" /> Compare models
          </button>
        )}
      </div>
    </div>
  );
}
