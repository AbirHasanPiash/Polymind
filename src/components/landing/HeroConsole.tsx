import { AudioLines, Columns2, ImageIcon, Wallet } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import type { Provider } from "../../api/types";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { cn } from "../../lib/utils";
import { ProviderDot } from "../brand/ProviderMark";

type Reply = {
  model: string;
  provider: Provider;
  lines: string[];
};

type Scene = {
  prompt: string;
  intent: string;
  /** One reply for a routed turn; two for an arena turn. */
  replies: Reply[];
  /** Credits for the turn, and what the wallet holds afterwards. */
  cost: string;
  balance: string;
};

/**
 * Each scene is a prompt the real router would classify this way — a coding
 * prompt goes to Opus 5, a summarisation prompt to the long-context model, a
 * proof to the reasoning model, a short question to the fastest one — and the
 * last scene shows an arena turn with two models answering side by side. The
 * costs are the registry's prices for a turn that size, so the wallet draws
 * down by a believable amount.
 */
const SCENES: Scene[] = [
  {
    prompt: "Refactor this endpoint to stream its response",
    intent: "coding",
    replies: [
      {
        model: "claude-opus-5",
        provider: "anthropic",
        lines: [
          "Make the handler an async generator and hand it to",
          "StreamingResponse, so the client gets the first token",
          "instead of waiting for the whole body to be built.",
        ],
      },
    ],
    cost: "0.1820",
    balance: "9.8180",
  },
  {
    prompt: "Summarise this 40-page contract into 10 bullets",
    intent: "long context",
    replies: [
      {
        model: "gemini-3.1-pro-preview",
        provider: "google",
        lines: [
          "1 — Term runs 24 months from 1 March and renews",
          "automatically unless either side gives 60 days' notice.",
          "2 — Liability is capped at the fees paid in the last year.",
        ],
      },
    ],
    cost: "2.5440",
    balance: "7.2740",
  },
  {
    prompt: "Prove that the sum of two odd numbers is even",
    intent: "reasoning",
    replies: [
      {
        model: "gpt-5.5",
        provider: "openai",
        lines: [
          "Let a = 2m + 1 and b = 2n + 1 for integers m and n.",
          "Then a + b = 2m + 2n + 2 = 2(m + n + 1), which is twice",
          "an integer — so the sum is even. ∎",
        ],
      },
    ],
    cost: "0.3120",
    balance: "6.9620",
  },
  {
    prompt: "What time is it in Tokyo?",
    intent: "quick reply",
    replies: [
      {
        model: "gemini-3.8-flash",
        provider: "google",
        lines: [
          "Tokyo runs on JST, UTC+9, with no daylight saving at",
          "any point in the year — 9 hours ahead of UTC.",
        ],
      },
    ],
    cost: "0.0096",
    balance: "6.9524",
  },
  {
    prompt: "Name our new note-taking app",
    intent: "arena",
    replies: [
      {
        model: "gpt-5.5",
        provider: "openai",
        lines: ["Margin — the space where", "your thinking lives."],
      },
      {
        model: "claude-sonnet-5",
        provider: "anthropic",
        lines: ["Foldnote — light, quick,", "and it tucks away neatly."],
      },
    ],
    cost: "0.4300",
    balance: "6.5224",
  },
];

const SCENE_MS = 5600;

/**
 * The hero's product demo: a chat turn being routed, streamed and billed.
 *
 * Decorative — the surrounding copy says everything this shows — so the whole
 * card is hidden from assistive technology rather than read out as a wall of
 * fake conversation.
 */
export function HeroConsole() {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setIndex((current) => (current + 1) % SCENES.length), SCENE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const scene = SCENES[index];
  const isArena = scene.replies.length > 1;

  return (
    <div aria-hidden="true" className="relative">
      {/* Ambient light behind the card, so it sits in the page rather than on it. */}
      <div className="landing-glow-2 pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10" />

      <div className="surface-pop relative overflow-hidden rounded-[20px]">
        {/* Loading beam along the top edge. */}
        <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
          <div className="animate-sweep h-px w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent" />
        </div>

        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          </div>
          <p className="font-mono text-[11px] tracking-tight text-fg-subtle">
            polymind · model: {isArena ? "arena" : "auto"}
          </p>
          <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-1 text-[10px] font-semibold text-success">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            live
          </div>
        </div>

        {/* Conversation. Keyed on the scene so the entrance animations re-run. */}
        <div
          key={index}
          // Tall enough for the longest scene at each width, so the card does
          // not resize as the demo cycles.
          className="flex min-h-[19rem] flex-col gap-4 px-4 py-5 sm:min-h-[15rem] sm:px-6"
        >
          <div className="animate-rise-in flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-soft px-3.5 py-2.5 text-[13px] leading-snug font-medium text-fg sm:text-sm">
              {scene.prompt}
            </p>
          </div>

          <div className="animate-rise-in flex flex-wrap items-center gap-2" style={{ animationDelay: "420ms" }}>
            <span className="rounded-lg border border-dashed border-line-strong px-2 py-1 font-mono text-[11px] text-fg-muted">
              intent: {scene.intent}
            </span>
            <span className="text-fg-subtle">→</span>
            {scene.replies.map((reply) => (
              <span
                key={reply.model}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] font-medium text-fg"
              >
                <ProviderDot provider={reply.provider} className="h-1.5 w-1.5" />
                {reply.model}
              </span>
            ))}
            <span className="text-[11px] text-fg-subtle">{isArena ? "side by side" : "auto-routed"}</span>
          </div>

          <div className={cn("grid gap-3", isArena && "sm:grid-cols-2")}>
            {scene.replies.map((reply, replyIndex) => (
              <div
                key={reply.model}
                className={cn("flex gap-3", isArena && "rounded-xl border border-line bg-surface-2/60 p-3")}
              >
                <div
                  className="animate-scale-in mt-0.5 h-6 w-6 shrink-0 rounded-lg bg-brand-gradient"
                  style={{ animationDelay: `${700 + replyIndex * 200}ms` }}
                />
                {/* One flowing paragraph, revealed a chunk at a time. Inline
                    elements cannot be transformed, so the chunks fade rather
                    than rise. */}
                <p className="text-[13px] leading-relaxed text-fg-muted sm:text-sm">
                  {reply.lines.map((chunk, chunkIndex) => (
                    <span
                      key={chunk}
                      className="animate-fade-in"
                      style={{ animationDelay: `${820 + replyIndex * 200 + chunkIndex * 300}ms` }}
                    >
                      {chunk}{" "}
                    </span>
                  ))}
                  <span
                    className="animate-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-accent"
                    style={{ animationDelay: `${820 + replyIndex * 200 + reply.lines.length * 300}ms` }}
                  />
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Billing bar */}
        <div className="flex items-center justify-between border-t border-line px-4 py-3 font-mono text-[11px] sm:px-6">
          <span className="text-fg-subtle">
            turn cost{" "}
            <span key={`cost-${index}`} className="animate-fade-in text-fg">
              {scene.cost}
            </span>{" "}
            cr
          </span>
          <span className="flex items-center gap-1.5 text-fg-subtle">
            <Wallet className="h-3.5 w-3.5" />
            balance{" "}
            <span key={`balance-${index}`} className="animate-fade-in text-fg">
              {scene.balance}
            </span>{" "}
            cr
          </span>
        </div>
      </div>

      {/* Capability chips orbiting the console. Only from xl up: below that the
          margins beside a 48rem card are narrower than a chip, so they would sit
          on top of the conversation instead of around it. */}
      <FloatingChip
        className="top-2 left-full ml-5"
        delay="0s"
        icon={<ImageIcon className="h-3.5 w-3.5 text-brand-3" />}
        label="Image · GPT Image 2"
      />
      <FloatingChip
        className="top-1/2 right-full mr-5"
        delay="1.6s"
        icon={<AudioLines className="h-3.5 w-3.5 text-accent" />}
        label="Voice · read aloud"
      />
      <FloatingChip
        className="bottom-4 left-full ml-5"
        delay="3.1s"
        icon={<Columns2 className="h-3.5 w-3.5 text-brand-2" />}
        label="Arena · 3 models at once"
      />
    </div>
  );
}

function FloatingChip({
  className,
  delay,
  icon,
  label,
}: {
  className: string;
  delay: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      style={{ animationDelay: delay }}
      className={cn(
        // whitespace-nowrap is load-bearing: anchored with left-full/right-full
        // there is no width left in the containing block, so the label would
        // otherwise wrap to one word per line.
        "surface-card animate-float absolute hidden items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium whitespace-nowrap text-fg xl:flex",
        className,
      )}
    >
      {icon}
      {label}
    </div>
  );
}
