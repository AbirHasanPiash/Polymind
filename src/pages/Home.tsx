import {
  ArrowRight,
  AudioLines,
  BarChart3,
  Check,
  Clapperboard,
  Columns2,
  Command,
  ImageIcon,
  Link2,
  MessageSquareText,
  Route,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { BrandMark } from "../components/brand/BrandMark";
import { ProviderMark } from "../components/brand/ProviderMark";
import { HeroConsole } from "../components/landing/HeroConsole";
import { LandingNav } from "../components/landing/LandingNav";
import { ModelWall } from "../components/landing/ModelWall";
import { Reveal } from "../components/landing/Reveal";
import { Kbd } from "../components/ui/primitives";
import { useAuth } from "../context/auth-context";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useModelCatalogue } from "../hooks/useModelCatalogue";
import { useScrolledPast } from "../hooks/useScrolledPast";
import { IS_MAC } from "../hooks/useHotkeys";
import { displayName, guessProvider } from "../lib/models";
import { cn } from "../lib/utils";

/** Intents the router recognises, in the order the routes panel lists them. */
const ROUTE_INTENTS: { key: string; label: string }[] = [
  { key: "coding", label: "coding" },
  { key: "reasoning", label: "reasoning" },
  { key: "long_context", label: "long context" },
  { key: "creative", label: "writing" },
  { key: "fast", label: "short & fast" },
  { key: "default", label: "everything else" },
];

/** Four studios: chat, image, voice, avatar video. */
const STUDIO_COUNT = 4;

const WALLET_RULES = [
  "Every new account starts with 10 credits, free.",
  "Pay per token, per image, per character of speech — never per seat.",
  "Credits do not expire and there is no monthly minimum.",
  "A job that fails is refunded automatically.",
  "Usage analytics show exactly where every credit went.",
];

const STEPS = [
  {
    title: "You type",
    body: "Send a prompt, with files attached if you have them. Nothing to configure first.",
  },
  {
    title: "It routes — and says why",
    body: "The prompt is scored for intent and matched to the model that suits it. Every reply carries the reason, or pin a model yourself and it is used verbatim.",
  },
  {
    title: "You pay for what ran",
    body: "Tokens stream back as they are produced, and the exact cost of the turn is deducted and shown under the reply.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { models, providers, catalogue } = useModelCatalogue();
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

  const flagships = models.filter((model) => model.tier === "flagship").slice(0, 3);

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-canvas font-sans text-fg">
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
              <span className="surface-card inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-wide text-fg-muted sm:text-xs">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                <span className="truncate">
                  {flagships.length > 0
                    ? flagships.map((model) => model.display_name).join(" · ")
                    : "GPT-5.5 · Claude Fable 5.1 · Gemini 3.1 Pro"}
                </span>
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-6 text-[2.65rem] leading-[1.04] font-semibold tracking-[-0.04em] text-balance text-fg sm:mt-8 sm:text-6xl lg:text-[4.25rem]">
                Every frontier model, <span className="text-gradient">one workspace.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-pretty text-fg-muted sm:mt-6 sm:text-lg">
                Chat with GPT, Claude and Gemini, put them side by side when you cannot decide, then
                generate images, speech and avatar video — all metered from a single credit wallet.
                No seats, no subscriptions, no switching tabs.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row">
                <Link
                  to={primaryHref}
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 hover:-translate-y-0.5 hover:opacity-95 active:translate-y-0 sm:w-auto"
                >
                  <Zap className="h-4 w-4" />
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#routing"
                  className="surface-card inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-[15px] font-semibold text-fg hover:-translate-y-0.5 hover:border-line-strong sm:w-auto"
                >
                  See how routing works
                </a>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <p className="mt-5 text-xs text-fg-subtle">
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
                <div key={stat.label} className="surface-card rounded-2xl px-4 py-5 text-center">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                      {stat.value}
                    </span>
                    <span className="mt-1 block text-[11px] tracking-widest text-fg-subtle uppercase">
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
                thread, or run several at once.
              </SectionLead>
            </Reveal>
          </div>

          <Reveal delay={100} className="mt-12">
            <ModelWall />
          </Reveal>
        </section>

        {/* ── Studios ────────────────────────────────────────────────────── */}
        <section id="studios" aria-labelledby="studios-heading" className="scroll-mt-24 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <SectionEyebrow>Studios</SectionEyebrow>
              <SectionHeading id="studios-heading">Four studios. One balance behind them.</SectionHeading>
              <SectionLead>
                Text, pictures, voice and video are separate crafts everywhere else. Here they share
                an account, a wallet and a history.
              </SectionLead>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:mt-16 md:grid-cols-6">
              <Reveal className="md:col-span-4">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-accent-soft text-accent">
                    <MessageSquareText className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Chat that picks its own model — and tells you why</CardTitle>
                  <CardBody>
                    Ask anything and the router reads the intent — code, reasoning, long context,
                    writing or speed — then sends it to the model that fits and labels the reply with
                    the reason. Pin one yourself whenever you would rather decide. Set the reasoning
                    depth per message, edit and resend, regenerate, or have any reply read aloud.
                  </CardBody>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {["auto", ...models.slice(0, 3).map((model) => model.id)].map((chip, index) => (
                      <span
                        key={chip}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px]",
                          index === 0
                            ? "bg-brand-gradient text-white"
                            : "border border-line bg-surface-2 text-fg-muted",
                        )}
                      >
                        {index === 0 && <Sparkles className="h-3 w-3" />}
                        {chip}
                      </span>
                    ))}
                  </div>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={80} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-brand-3/10 text-brand-3">
                    <Columns2 className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Arena</CardTitle>
                  <CardBody>
                    Cannot decide between two models? Pick two or three and every reply streams side
                    by side in the same conversation, each one billed at its own rate.
                  </CardBody>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={40} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-brand-3/10 text-brand-3">
                    <ImageIcon className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Image studio</CardTitle>
                  <CardBody>
                    GPT Image 2 and Google's Nano Banana 2 and Pro, up to 4K, with reference-image
                    editing when you need a variation rather than a fresh idea.
                  </CardBody>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={80} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-accent-soft text-accent">
                    <AudioLines className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Voice studio</CardTitle>
                  <CardBody>
                    Google Cloud and OpenAI voices, from neural narrators to steerable studio voices.
                    Paste a script, or read any chat reply aloud with one click.
                  </CardBody>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={120} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-success/10 text-success">
                    <Clapperboard className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Avatar video</CardTitle>
                  <CardBody>
                    Turn a portrait and a script into a lip-synced talking video, rendered in the
                    background and filed in your library.
                  </CardBody>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={40} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-info/10 text-info">
                    <Link2 className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Share and export</CardTitle>
                  <CardBody>
                    Publish a read-only link to any conversation, or download it as Markdown or JSON.
                    Revoke a link whenever you like.
                  </CardBody>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={80} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-info/10 text-info">
                    <BarChart3 className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Usage analytics</CardTitle>
                  <CardBody>
                    Spend by day, by model and by studio, with the last charges listed. No surprises
                    at the end of the month, because there is no end of the month.
                  </CardBody>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={120} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <CardIcon className="bg-warning/15 text-warning">
                    <Command className="h-5 w-5" />
                  </CardIcon>
                  <CardTitle>Built for the keyboard</CardTitle>
                  <CardBody>
                    <span className="inline-flex items-center gap-1 align-middle">
                      <Kbd>{IS_MAC ? "⌘" : "Ctrl"}</Kbd>
                      <Kbd>K</Kbd>
                    </span>{" "}
                    opens a command palette for pages, recent chats and models; new chat, model
                    switching and sending never need the mouse.
                  </CardBody>
                </SpotlightCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Routing ────────────────────────────────────────────────────── */}
        <section id="routing" aria-labelledby="routing-heading" className="scroll-mt-24 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <SectionEyebrow>How it works</SectionEyebrow>
              <SectionHeading id="routing-heading">You type. It routes. You pay for what ran.</SectionHeading>
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
                        <span className="surface-card flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-semibold text-fg">
                          {index + 1}
                        </span>
                        {index < STEPS.length - 1 && (
                          <span className="mt-2 w-px flex-1 border-l border-dashed border-line-strong" />
                        )}
                      </div>
                      <div className="pb-2">
                        <h3 className="text-base font-semibold text-fg">{step.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{step.body}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal delay={120}>
                <div className="surface-pop h-full rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-accent" />
                    <p className="font-mono text-xs text-fg-muted">default routes</p>
                  </div>

                  {/* Read from the live catalogue, so the panel can never name a
                      route the backend does not use. */}
                  <ul className="mt-5 space-y-2.5">
                    {ROUTE_INTENTS.filter((intent) => catalogue.routing[intent.key]).map((intent) => {
                      const id = catalogue.routing[intent.key];
                      return (
                        <li
                          key={intent.key}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line pb-2.5 font-mono text-[12px] last:border-b-0 sm:text-[13px]"
                        >
                          <span className="w-28 shrink-0 text-fg-muted">{intent.label}</span>
                          <span className="text-fg-subtle">→</span>
                          <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                            <ProviderMark provider={guessProvider(id)} size="xs" />
                            {displayName(id, models)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="mt-5 text-xs leading-relaxed text-fg-subtle">
                    Prices come from the same registry as the routes, so a turn can never be served
                    by one model and billed at another's rate.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Credits ────────────────────────────────────────────────────── */}
        <section id="credits" aria-labelledby="credits-heading" className="scroll-mt-24 py-16 sm:py-24">
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
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success ring-1 ring-success/25 ring-inset">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-sm leading-relaxed text-fg-muted">{rule}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={isAuthenticated ? "/dashboard/billing" : "/signup"}
                  className="group mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-fg shadow-sm hover:-translate-y-0.5 hover:bg-accent-strong"
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
            <div className="surface-pop relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-20">
              <div
                aria-hidden="true"
                className="landing-glow-1 pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2"
              />
              <div className="relative">
                <BrandMark className="mx-auto h-10 w-10 shadow-lg shadow-accent/25" />
                <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-balance text-fg sm:text-4xl">
                  Bring every model into one workspace.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-sm text-pretty text-fg-muted sm:text-base">
                  Ten credits are waiting in your account. That is a few hundred quick replies, or
                  your first batch of images.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    to={primaryHref}
                    className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 hover:-translate-y-0.5 hover:opacity-95 sm:w-auto"
                  >
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  {!isAuthenticated && (
                    <Link
                      to="/login"
                      className="surface-card inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-[15px] font-semibold text-fg hover:-translate-y-0.5 hover:border-line-strong sm:w-auto"
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

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight text-fg">Polymind</span>
          </div>

          <nav aria-label="Footer" className="flex items-center gap-6 text-sm">
            <a href="#studios" className="text-fg-muted hover:text-fg">
              Studios
            </a>
            <a href="#models" className="text-fg-muted hover:text-fg">
              Models
            </a>
            <a href="#credits" className="text-fg-muted hover:text-fg">
              Credits
            </a>
            <Link to={isAuthenticated ? "/dashboard" : "/login"} className="text-fg-muted hover:text-fg">
              {isAuthenticated ? "Dashboard" : "Sign in"}
            </Link>
          </nav>

          <p className="text-xs text-fg-subtle">© {new Date().getFullYear()} Polymind. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ── Page furniture ──────────────────────────────────────────────────────── */

/**
 * Ambient background: grid and three drifting colour fields. Fixed rather than
 * per-section, so the light stays put while the content scrolls through it.
 * The glows are radial gradients rather than blurred circles on purpose: an
 * animated `filter: blur()` re-rasterises a huge layer on every frame, while a
 * gradient is painted once and only transformed.
 */
function Ambience() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas">
      <div className="landing-grid absolute inset-0" />
      <div className="landing-glow-1 animate-aurora-1 absolute -top-[26rem] left-1/2 h-[52rem] w-[68rem] -translate-x-1/2" />
      <div className="landing-glow-2 animate-aurora-2 absolute top-[28%] -left-[20rem] h-[44rem] w-[44rem]" />
      <div className="landing-glow-3 animate-aurora-3 absolute -right-[18rem] bottom-[6%] h-[40rem] w-[40rem]" />
    </div>
  );
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">{children}</p>;
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
        "mt-3 text-3xl font-semibold tracking-[-0.03em] text-balance text-fg sm:text-[2.5rem] sm:leading-[1.1]",
        align === "center" && "text-center",
      )}
    >
      {children}
    </h2>
  );
}

function SectionLead({ children, align = "center" }: { children: ReactNode; align?: "center" | "left" }) {
  return (
    <p
      className={cn(
        "mt-4 text-sm leading-relaxed text-pretty text-fg-muted sm:text-base",
        align === "center" && "text-center",
      )}
    >
      {children}
    </p>
  );
}

function CardIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("inline-flex h-11 w-11 items-center justify-center rounded-xl", className)}>{children}</div>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="mt-5 text-lg font-semibold tracking-tight text-fg">{children}</h3>;
}

function CardBody({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-fg-muted">{children}</p>;
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
        "group surface-card relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-0.5 hover:border-line-strong",
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

/** The wallet, drawn the way the usage page shows it. */
function WalletCard() {
  const spend = [
    { label: "Chat", share: "42%", width: "42%", tone: "bg-accent" },
    { label: "Images", share: "28%", width: "28%", tone: "bg-brand-3" },
    { label: "Voice", share: "19%", width: "19%", tone: "bg-brand-2" },
    { label: "Video", share: "11%", width: "11%", tone: "bg-success" },
  ];

  return (
    <div className="surface-pop relative overflow-hidden rounded-2xl p-6 sm:p-8">
      <div aria-hidden="true" className="landing-glow-2 pointer-events-none absolute -top-24 -right-16 h-64 w-64" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-fg-muted uppercase">
            <Wallet className="h-4 w-4" />
            Balance
          </span>
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
            signup bonus
          </span>
        </div>

        <p className="mt-4 font-mono text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          10.000000
          <span className="ml-2 text-base font-normal text-fg-subtle">cr</span>
        </p>
        <p className="mt-2 text-xs text-fg-subtle">
          Metered to six decimal places — you are charged for the tokens that ran, not a rounded-up
          request.
        </p>

        <div className="mt-8 space-y-3">
          {spend.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-fg-muted">{row.label}</span>
                <span className="font-mono text-fg-subtle">{row.share}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div className={cn("h-full rounded-full", row.tone)} style={{ width: row.width }} />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 border-t border-line pt-4 text-xs text-fg-subtle">
          One balance across every studio. Spend it however the week goes.
        </p>
      </div>
    </div>
  );
}
