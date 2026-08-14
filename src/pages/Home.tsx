import {
  ArrowRight,
  AudioLines,
  Check,
  Clapperboard,
  ImageIcon,
  MessageSquareText,
  RotateCcw,
  Route,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { BrandMark } from "../components/landing/BrandMark";
import { HeroConsole } from "../components/landing/HeroConsole";
import { LandingNav } from "../components/landing/LandingNav";
import { ModelWall } from "../components/landing/ModelWall";
import { Reveal } from "../components/landing/Reveal";
import { useAuth } from "../context/auth-context";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useModelCatalogue } from "../hooks/useModelCatalogue";
import { useScrolledPast } from "../hooks/useScrolledPast";
import { cn } from "../lib/utils";

/* The router's own defaults, quoted so the page describes what the backend
   actually does rather than a marketing approximation of it. */
const ROUTES = [
  { intent: "coding", model: "claude-4.5-opus" },
  { intent: "reasoning", model: "gpt-5.2-pro" },
  { intent: "long context", model: "gemini-2.5-pro" },
  { intent: "short & fast", model: "gemini-3-flash-preview" },
];

/** Four studios: chat, image, speech, avatar video. */
const STUDIO_COUNT = 4;

const WALLET_RULES = [
  "Every new account starts with 10 credits, free.",
  "Pay per token, per image, per character of speech — never per seat.",
  "Credits do not expire and there is no monthly minimum.",
  "A job that fails is refunded automatically.",
];

const STEPS = [
  {
    title: "You type",
    body: "Send a prompt, with files attached if you have them. Nothing to configure first.",
  },
  {
    title: "It routes",
    body: "The prompt is scored for intent and matched to the model that suits it — or pin one yourself and it is used verbatim.",
  },
  {
    title: "You pay for what ran",
    body: "Tokens stream back as they are produced, and the exact cost of the turn is deducted and shown.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { models, providers } = useModelCatalogue();
  const { ref: topSentinel, passed: scrolled } = useScrolledPast<HTMLDivElement>();

  const primaryHref = isAuthenticated ? "/dashboard" : "/signup";
  const primaryLabel = isAuthenticated ? "Open dashboard" : "Start free";

  // Counted from the live catalogue rather than written down, so the page keeps
  // telling the truth when a model is added or retired.
  const stats = [
    { value: String(models.length), label: "models" },
    { value: String(providers), label: "providers" },
    { value: String(STUDIO_COUNT), label: "studios" },
    { value: "1", label: "wallet" },
  ];

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden font-sans">
      <Ambience />

      {/* Watched by the nav to know whether the page has moved. It lives in the
          scrolling content, so it works no matter which element scrolls. */}
      <div ref={topSentinel} aria-hidden="true" className="absolute top-0 left-0 h-3 w-px" />

      <LandingNav isAuthenticated={isAuthenticated} condensed={scrolled} />

      <main>
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pt-28 pb-16 sm:px-6 sm:pt-36 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <span className="landing-panel inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-wide text-slate-600 backdrop-blur-sm sm:text-xs dark:text-slate-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                </span>
                GPT-5.2 Pro · Claude 4.5 Opus · Gemini 3 Pro
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-6 text-[2.65rem] leading-[1.04] font-semibold tracking-[-0.04em] text-balance text-slate-900 sm:mt-8 sm:text-6xl lg:text-[4.25rem] dark:text-white">
                Every frontier model,{" "}
                <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-violet-400 dark:to-pink-400">
                  one workspace.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-pretty text-slate-600 sm:mt-6 sm:text-lg dark:text-slate-400">
                Chat with GPT, Claude and Gemini, then generate images, speech and avatar video —
                all metered from a single credit wallet. No seats, no subscriptions, no switching
                tabs.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row">
                <Link
                  to={primaryHref}
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-[15px] font-semibold text-white shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 sm:w-auto dark:bg-white dark:text-slate-900 dark:shadow-white/10 dark:hover:bg-slate-100"
                >
                  <Zap className="h-4 w-4" />
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#routing"
                  className="landing-panel inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-[15px] font-semibold text-slate-700 backdrop-blur-sm hover:-translate-y-0.5 sm:w-auto dark:text-slate-200"
                >
                  See how routing works
                </a>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <p className="mt-5 text-xs text-slate-500 dark:text-slate-500">
                10 free credits on signup · No card required · Pay only for what you generate
              </p>
            </Reveal>
          </div>

          <Reveal delay={200} className="mx-auto mt-14 max-w-3xl sm:mt-20">
            <HeroConsole />
          </Reveal>

          <Reveal delay={120}>
            <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:mt-20 sm:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="landing-panel rounded-2xl px-4 py-5 text-center backdrop-blur-sm"
                >
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                      {stat.value}
                    </span>
                    <span className="mt-1 block text-[11px] tracking-widest text-slate-500 uppercase dark:text-slate-500">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>

        {/* ── Model catalogue ────────────────────────────────────────────── */}
        <section id="models" aria-labelledby="models-heading" className="scroll-mt-24 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <SectionEyebrow>The catalogue</SectionEyebrow>
              <SectionHeading id="models-heading">Every model, one price list.</SectionHeading>
              <SectionLead>
                This wall is fetched live from the platform's registry — the same source the router
                reads and the biller charges from. Switch models mid-conversation without losing the
                thread.
              </SectionLead>
            </Reveal>
          </div>

          <Reveal delay={100} className="mt-12">
            <ModelWall />
          </Reveal>
        </section>

        {/* ── Studios ────────────────────────────────────────────────────── */}
        <section
          id="studios"
          aria-labelledby="studios-heading"
          className="scroll-mt-24 py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <SectionEyebrow>Studios</SectionEyebrow>
              <SectionHeading id="studios-heading">
                Four studios. One balance behind them.
              </SectionHeading>
              <SectionLead>
                Text, pictures, voice and video are separate crafts everywhere else. Here they share
                an account, a wallet and a history.
              </SectionLead>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:mt-16 md:grid-cols-6">
              <Reveal className="md:col-span-4">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-blue-500/10 text-blue-500 ring-blue-500/20">
                    <MessageSquareText className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Chat that picks its own model</CardTitle>
                  <CardBody>
                    Ask anything and the router reads the intent — code, reasoning, long context or
                    speed — then sends it to the model that fits. Pin one yourself whenever you would
                    rather decide. Answers stream token by token over a socket that survives a model
                    change mid-conversation.
                  </CardBody>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {["auto", "gpt-5.2", "claude-4.5-sonnet", "gemini-3-flash-preview"].map(
                      (chip, index) => (
                        <span
                          key={chip}
                          className={cn(
                            "rounded-lg px-2.5 py-1 font-mono text-[11px]",
                            index === 0
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                              : "landing-panel text-slate-600 dark:text-slate-300",
                          )}
                        >
                          {chip}
                        </span>
                      ),
                    )}
                  </div>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={80} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-pink-500/10 text-pink-500 ring-pink-500/20">
                    <ImageIcon className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Image studio</CardTitle>
                  <CardBody>
                    gpt-image-1.5 and DALL·E 3, up to 1536×1024, with reference-image editing when
                    you need a variation rather than a fresh idea.
                  </CardBody>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={40} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-violet-500/10 text-violet-500 ring-violet-500/20">
                    <AudioLines className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Neural voice</CardTitle>
                  <CardBody>
                    Google Cloud neural voices across dozens of languages — read out any chat reply,
                    or paste your own script.
                  </CardBody>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={120} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-emerald-500/10 text-emerald-500 ring-emerald-500/20">
                    <Clapperboard className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Avatar video</CardTitle>
                  <CardBody>
                    Turn a portrait and a script into a lip-synced talking video with D-ID, rendered
                    in the background and filed in your library.
                  </CardBody>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={160} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-amber-500/10 text-amber-500 ring-amber-500/20">
                    <RotateCcw className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Refunded on failure</CardTitle>
                  <CardBody>
                    Media work is charged up front and handed to a worker. If the job fails, the
                    credits come straight back.
                  </CardBody>
                </SpotlightCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Routing ────────────────────────────────────────────────────── */}
        <section
          id="routing"
          aria-labelledby="routing-heading"
          className="scroll-mt-24 py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <SectionEyebrow>How it works</SectionEyebrow>
              <SectionHeading id="routing-heading">
                You type. It routes. You pay for what ran.
              </SectionHeading>
              <SectionLead>
                Picking the right model for each question is most of the skill in using AI well. The
                platform does it for you, and shows its work.
              </SectionLead>
            </Reveal>

            <div className="mt-12 grid gap-8 sm:mt-16 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-6">
                {STEPS.map((step, index) => (
                  <Reveal key={step.title} delay={index * 90}>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className="landing-panel flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {index + 1}
                        </span>
                        {index < STEPS.length - 1 && (
                          <span className="landing-divide mt-2 w-px flex-1 border-l border-dashed" />
                        )}
                      </div>
                      <div className="pb-2">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          {step.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal delay={120}>
                <div className="landing-panel-solid h-full rounded-2xl p-5 shadow-[0_2px_4px_rgb(15_23_42_/_0.04),0_24px_64px_-32px_rgb(15_23_42_/_0.3)] sm:p-6 dark:shadow-[0_24px_64px_-32px_rgb(0_0_0_/_0.8)]">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-blue-500" />
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      default routes
                    </p>
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {ROUTES.map((route) => (
                      <li
                        key={route.intent}
                        className="landing-divide flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-2.5 font-mono text-[12px] last:border-b-0 sm:text-[13px]"
                      >
                        <span className="w-28 shrink-0 text-slate-500 dark:text-slate-400">
                          {route.intent}
                        </span>
                        <span className="text-slate-400 dark:text-slate-600">→</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {route.model}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-5 text-xs leading-relaxed text-slate-500 dark:text-slate-500">
                    Prices come from the same registry as the routes, so a turn can never be served
                    by one model and billed at another's rate.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Credits ────────────────────────────────────────────────────── */}
        <section
          id="credits"
          aria-labelledby="credits-heading"
          className="scroll-mt-24 py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <SectionEyebrow>Credits</SectionEyebrow>
                <SectionHeading id="credits-heading" align="left">
                  One wallet. Everything inside.
                </SectionHeading>
                <SectionLead align="left">
                  Stop paying five subscriptions for models you use twice a month. Buy credits once
                  and spend them on whatever you actually generate.
                </SectionLead>

                <ul className="mt-8 space-y-3.5">
                  {WALLET_RULES.map((rule) => (
                    <li key={rule} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-500 ring-1 ring-emerald-500/25 ring-inset">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {rule}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={isAuthenticated ? "/dashboard/billing" : "/signup"}
                  className="group mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:shadow-white/10 dark:hover:bg-slate-100"
                >
                  {isAuthenticated ? "Top up credits" : "Claim 10 free credits"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Reveal>

              <Reveal delay={120}>
                <WalletCard />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Closing call to action ─────────────────────────────────────── */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <Reveal className="mx-auto max-w-4xl">
            <div className="landing-panel-solid relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-20">
              <div
                aria-hidden="true"
                className="landing-glow-1 pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2"
              />
              <div className="relative">
                <Sparkles className="mx-auto h-6 w-6 text-blue-500" />
                <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-balance text-slate-900 sm:text-4xl dark:text-white">
                  Bring every model into one workspace.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-sm text-pretty text-slate-600 sm:text-base dark:text-slate-400">
                  Ten credits are waiting in your account. That is a few hundred fast replies, or
                  your first batch of images.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    to={primaryHref}
                    className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-[15px] font-semibold text-white shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto dark:bg-white dark:text-slate-900 dark:shadow-white/10 dark:hover:bg-slate-100"
                  >
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  {!isAuthenticated && (
                    <Link
                      to="/login"
                      className="landing-panel inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-[15px] font-semibold text-slate-700 backdrop-blur-sm hover:-translate-y-0.5 sm:w-auto dark:text-slate-200"
                    >
                      I already have an account
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="landing-divide border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              MultiAIModel
            </span>
          </div>

          <nav aria-label="Footer" className="flex items-center gap-6 text-sm">
            <a
              href="#studios"
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Studios
            </a>
            <a
              href="#credits"
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Credits
            </a>
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              {isAuthenticated ? "Dashboard" : "Sign in"}
            </Link>
          </nav>

          <p className="text-xs text-slate-500 dark:text-slate-500">
            © {new Date().getFullYear()} MultiAIModel. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ── Page furniture ──────────────────────────────────────────────────────── */

/**
 * Ambient background: canvas, grid, three drifting colour fields and a film
 * grain. Fixed rather than per-section, so the light stays put while the
 * content scrolls through it.
 */
function Ambience() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="landing-surface absolute inset-0" />
      <div className="landing-grid absolute inset-0" />
      <div className="landing-glow-1 animate-aurora-1 absolute -top-[26rem] left-1/2 h-[52rem] w-[68rem] -translate-x-1/2" />
      <div className="landing-glow-2 animate-aurora-2 absolute top-[28%] -left-[20rem] h-[44rem] w-[44rem]" />
      <div className="landing-glow-3 animate-aurora-3 absolute -right-[18rem] bottom-[6%] h-[40rem] w-[40rem]" />
      <div className="landing-noise absolute inset-0" />
    </div>
  );
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">
      {children}
    </p>
  );
}

function SectionHeading({
  children,
  id,
  align = "center",
}: {
  children: ReactNode;
  id?: string;
  align?: "center" | "left";
}) {
  return (
    <h2
      id={id}
      className={cn(
        "mt-3 text-3xl font-semibold tracking-[-0.03em] text-balance text-slate-900 sm:text-[2.5rem] sm:leading-[1.1] dark:text-white",
        align === "center" && "text-center",
      )}
    >
      {children}
    </h2>
  );
}

function SectionLead({
  children,
  align = "center",
}: {
  children: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <p
      className={cn(
        "mt-4 text-sm leading-relaxed text-pretty text-slate-600 sm:text-base dark:text-slate-400",
        align === "center" && "text-center",
      )}
    >
      {children}
    </p>
  );
}

function CardIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
      {children}
    </h3>
  );
}

function CardBody({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{children}</p>
  );
}

/**
 * Card with a highlight that follows the pointer.
 *
 * The rectangle is measured once on enter instead of on every move — reading
 * layout inside a pointermove handler is the classic way to make a hover effect
 * stutter — and the two custom properties are written at most once per frame.
 * Coarse pointers skip the whole thing: there is nothing to follow on a phone.
 */
function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const boxRef = useRef<DOMRect | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const handleEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (!finePointer) return;
    boxRef.current = event.currentTarget.getBoundingClientRect();
  };

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    if (!finePointer || !box || frameRef.current !== null) return;

    const node = event.currentTarget;
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      node.style.setProperty("--mx", `${x}px`);
      node.style.setProperty("--my", `${y}px`);
    });
  };

  return (
    <div
      onPointerEnter={handleEnter}
      onPointerMove={handleMove}
      className={cn(
        "group landing-panel relative overflow-hidden rounded-2xl p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-[var(--landing-line-strong)] hover:shadow-[0_24px_48px_-24px_rgb(15_23_42_/_0.25)] dark:hover:shadow-[0_24px_48px_-24px_rgb(0_0_0_/_0.8)]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="landing-spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** The wallet, drawn the way the billing page shows it. */
function WalletCard() {
  const spend = [
    { label: "Chat", share: "42%", width: "42%", tone: "bg-blue-500" },
    { label: "Images", share: "28%", width: "28%", tone: "bg-pink-500" },
    { label: "Voice", share: "19%", width: "19%", tone: "bg-violet-500" },
    { label: "Video", share: "11%", width: "11%", tone: "bg-emerald-500" },
  ];

  return (
    <div className="landing-panel-solid relative overflow-hidden rounded-2xl p-6 shadow-[0_2px_4px_rgb(15_23_42_/_0.04),0_32px_64px_-32px_rgb(15_23_42_/_0.35)] sm:p-8 dark:shadow-[0_32px_80px_-32px_rgb(0_0_0_/_0.9)]">
      <div
        aria-hidden="true"
        className="landing-glow-2 pointer-events-none absolute -top-24 -right-16 h-64 w-64"
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-slate-500 uppercase dark:text-slate-400">
            <Wallet className="h-4 w-4" />
            Balance
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            signup bonus
          </span>
        </div>

        <p className="mt-4 font-mono text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          10.000000
          <span className="ml-2 text-base font-normal text-slate-400 dark:text-slate-500">cr</span>
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          Metered to six decimal places — you are charged for the tokens that ran, not a rounded-up
          request.
        </p>

        <div className="mt-8 space-y-3">
          {spend.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">{row.label}</span>
                <span className="font-mono text-slate-400 dark:text-slate-500">{row.share}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-900/5 dark:bg-white/5">
                <div className={cn("h-full rounded-full", row.tone)} style={{ width: row.width }} />
              </div>
            </div>
          ))}
        </div>

        <p className="landing-divide mt-6 border-t pt-4 text-xs text-slate-500 dark:text-slate-500">
          One balance across every studio. Spend it however the week goes.
        </p>
      </div>
    </div>
  );
}
