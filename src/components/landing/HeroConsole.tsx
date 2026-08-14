import { AudioLines, ImageIcon, Video, Wallet } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useMediaQuery } from "../../hooks/useMediaQuery";
import { cn } from "../../lib/utils";

type Provider = "OpenAI" | "Anthropic" | "Google";

type Scene = {
  prompt: string;
  intent: string;
  model: string;
  provider: Provider;
  reply: string[];
  /** Credits for the turn, and what the wallet holds afterwards. */
  cost: string;
  balance: string;
};

const PROVIDER_DOT: Record<Provider, string> = {
  OpenAI: "bg-emerald-400",
  Anthropic: "bg-orange-400",
  Google: "bg-sky-400",
};

/**
 * Each scene is a prompt the real router would classify this way — a coding
 * prompt goes to Opus, a summarisation prompt to the long-context model, a
 * proof to the reasoning model, and a short question to the fastest one. The
 * costs are the registry's prices for a turn that size, so the wallet draws
 * down by a believable amount.
 */
const SCENES: Scene[] = [
  {
    prompt: "Refactor this endpoint to stream its response",
    intent: "coding",
    model: "claude-4.5-opus",
    provider: "Anthropic",
    reply: [
      "Make the handler an async generator and hand it to",
      "StreamingResponse, so the client gets the first token",
      "instead of waiting for the whole body to be built.",
    ],
    cost: "0.0590",
    balance: "9.9410",
  },
  {
    prompt: "Summarise this 40-page contract into 10 bullets",
    intent: "long context",
    model: "gemini-2.5-pro",
    provider: "Google",
    reply: [
      "1 — Term runs 24 months from 1 March and renews",
      "automatically unless either side gives 60 days' notice.",
      "2 — Liability is capped at the fees paid in the last year.",
    ],
    cost: "1.1024",
    balance: "8.8386",
  },
  {
    prompt: "Prove that the sum of two odd numbers is even",
    intent: "reasoning",
    model: "gpt-5.2-pro",
    provider: "OpenAI",
    reply: [
      "Let a = 2m + 1 and b = 2n + 1 for integers m and n.",
      "Then a + b = 2m + 2n + 2 = 2(m + n + 1), which is twice",
      "an integer — so the sum is even. ∎",
    ],
    cost: "0.4158",
    balance: "8.4228",
  },
  {
    prompt: "What time is it in Tokyo?",
    intent: "quick reply",
    model: "gemini-3-flash-preview",
    provider: "Google",
    reply: [
      "Tokyo runs on JST, UTC+9, with no daylight saving at",
      "any point in the year. That is 9 hours ahead of UTC and",
      "14 ahead of New York through the winter.",
    ],
    cost: "0.0056",
    balance: "8.4172",
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

  return (
    <div aria-hidden="true" className="relative">
      {/* Ambient light behind the card, so it sits in the page rather than on it. */}
      <div className="landing-glow-2 pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10" />

      <div className="landing-panel-solid relative overflow-hidden rounded-[20px] shadow-[0_2px_4px_rgb(15_23_42_/_0.04),0_24px_64px_-24px_rgb(15_23_42_/_0.35)] dark:shadow-[0_24px_80px_-32px_rgb(0_0_0_/_0.9)]">
        {/* Loading beam along the top edge. */}
        <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
          <div className="animate-sweep h-px w-1/3 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        </div>

        {/* Title bar */}
        <div className="landing-divide flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <p className="font-mono text-[11px] tracking-tight text-slate-500 dark:text-slate-500">
            multiaimodel · model: auto
          </p>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-3.5 py-2.5 text-[13px] leading-snug font-medium text-white sm:text-sm dark:bg-white dark:text-slate-900">
              {scene.prompt}
            </p>
          </div>

          <div
            className="animate-rise-in flex flex-wrap items-center gap-2"
            style={{ animationDelay: "420ms" }}
          >
            <span className="landing-divide rounded-lg border border-dashed px-2 py-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              intent: {scene.intent}
            </span>
            <span className="text-slate-400 dark:text-slate-600">→</span>
            <span className="landing-panel inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[11px] font-medium text-slate-700 dark:text-slate-200">
              <span className={cn("h-1.5 w-1.5 rounded-full", PROVIDER_DOT[scene.provider])} />
              {scene.model}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">auto-routed</span>
          </div>

          <div className="flex gap-3">
            <div
              className="animate-scale-in mt-0.5 h-6 w-6 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 via-violet-500 to-pink-500"
              style={{ animationDelay: "700ms" }}
            />
            {/* One flowing paragraph, revealed a chunk at a time. Rendering each
                chunk as its own line instead re-wraps on a narrow screen and
                turns the reply into ragged half-sentences. Inline elements
                cannot be transformed, so the chunks fade rather than rise. */}
            <p className="text-[13px] leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
              {scene.reply.map((chunk, chunkIndex) => (
                <span
                  key={chunk}
                  className="animate-fade-in"
                  style={{ animationDelay: `${820 + chunkIndex * 300}ms` }}
                >
                  {chunk}{" "}
                </span>
              ))}
              <span
                className="animate-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-blue-500"
                style={{ animationDelay: `${820 + scene.reply.length * 300}ms` }}
              />
            </p>
          </div>
        </div>

        {/* Billing bar */}
        <div className="landing-divide flex items-center justify-between border-t px-4 py-3 font-mono text-[11px] sm:px-6">
          <span className="text-slate-500 dark:text-slate-500">
            turn cost{" "}
            <span key={`cost-${index}`} className="animate-fade-in text-slate-900 dark:text-white">
              {scene.cost}
            </span>{" "}
            cr
          </span>
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-500">
            <Wallet className="h-3.5 w-3.5" />
            balance{" "}
            <span
              key={`balance-${index}`}
              className="animate-fade-in text-slate-900 dark:text-white"
            >
              {scene.balance}
            </span>{" "}
            cr
          </span>
        </div>
      </div>

      {/* Capability chips orbiting the console. Only from xl up: below that the
          margins beside a 48rem card are narrower than a chip, so they would sit
          on top of the conversation instead of around it. */}
      {/* Anchored to the card's outer edges with left-full / right-full rather
          than a fixed offset, so a chip can never creep over the conversation
          as the card's width changes. */}
      <FloatingChip
        className="top-2 left-full ml-5"
        delay="0s"
        icon={<ImageIcon className="h-3.5 w-3.5 text-pink-500" />}
        label="Image · 1536×1024"
      />
      <FloatingChip
        className="top-1/2 right-full mr-5"
        delay="1.6s"
        icon={<AudioLines className="h-3.5 w-3.5 text-violet-500" />}
        label="Voice · en-US-Neural2-F"
      />
      <FloatingChip
        className="bottom-4 left-full ml-5"
        delay="3.1s"
        icon={<Video className="h-3.5 w-3.5 text-emerald-500" />}
        label="Avatar · lip-synced"
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
        "landing-panel animate-float absolute hidden items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium whitespace-nowrap text-slate-700 shadow-lg shadow-slate-900/5 backdrop-blur-xl xl:flex dark:text-slate-200 dark:shadow-black/40",
        className,
      )}
    >
      {icon}
      {label}
    </div>
  );
}
