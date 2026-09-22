import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Columns2, Sparkles, Wallet } from "lucide-react";

import { useModelCatalogue } from "../../hooks/useModelCatalogue";
import { cn } from "../../lib/utils";
import { BrandMark, Wordmark } from "../brand/BrandMark";
import { ProviderMark } from "../brand/ProviderMark";
import GoogleAuthBtn from "../GoogleAuthBtn";
import { ThemeToggle } from "../layout/ThemeToggle";
import { useGoogleLoginAvailable } from "./useGoogleLoginAvailable";

type AuthCardProps = {
  title: string;
  subtitle: string;
  error?: string | null;
  children: ReactNode;
  footer: ReactNode;
  /** Show "Continue with Google" above the form. */
  showGoogle?: boolean;
  /** Where Google sign-in should land. */
  redirectTo?: string;
};

const VALUE_PROPS = [
  {
    icon: Sparkles,
    title: "Auto picks the model",
    body: "Each message is routed to the model that suits it — and the reply says why.",
  },
  {
    icon: Columns2,
    title: "Compare side by side",
    body: "Run two or three models on the same prompt in one conversation.",
  },
  {
    icon: Wallet,
    title: "One wallet, no seats",
    body: "Pay per token, image or second of speech. Ten credits free to start.",
  },
];

/**
 * Shared shell for the sign-in, sign-up and password screens.
 *
 * On large screens the form sits beside a brand panel that says what the
 * product is; on phones the panel folds away and the form stands alone.
 */
export default function AuthCard({
  title,
  subtitle,
  error,
  children,
  footer,
  showGoogle = true,
  redirectTo,
}: AuthCardProps) {
  const { models } = useModelCatalogue();
  const googleAvailable = useGoogleLoginAvailable();
  const chips = models.filter((model) => model.tier === "flagship").slice(0, 3);
  const withGoogle = showGoogle && googleAvailable;

  return (
    <div className="grid min-h-dvh bg-canvas text-fg lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-gradient text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.25), transparent 40%)",
          }}
        />
        <Link to="/" className="relative inline-flex items-center gap-2.5 self-start rounded-xl">
          <BrandMark className="h-9 w-9 shadow-lg shadow-black/20" />
          <span className="text-lg font-semibold tracking-tight">Polymind</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-4xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
            Every frontier model, one workspace.
          </h2>
          <ul className="mt-10 space-y-6">
            {VALUE_PROPS.map((prop) => (
              <li key={prop.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 ring-inset">
                  <prop.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">{prop.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-white/75">{prop.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex flex-wrap gap-2">
          {chips.map((model) => (
            <span
              key={model.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium ring-1 ring-white/20 ring-inset"
            >
              <ProviderMark provider={model.provider} size="xs" className="bg-white/20 text-white" />
              {model.display_name}
            </span>
          ))}
        </div>
      </aside>

      {/* Form column */}
      <div className="relative flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="rounded-xl lg:hidden">
            <Wordmark />
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md animate-rise-in">
            <div className="mb-7">
              <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h1>
              <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p>
            </div>

            {withGoogle && (
              <>
                <div className="mb-6">
                  <GoogleAuthBtn redirectTo={redirectTo} />
                </div>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-line" />
                  </div>
                  <div className="relative flex justify-center text-[11px] tracking-wide uppercase">
                    <span className="bg-canvas px-2 font-medium text-fg-subtle">Or continue with email</span>
                  </div>
                </div>
              </>
            )}

            {/* role="alert" so screen readers announce the failure immediately. */}
            {error && (
              <div
                role="alert"
                className={cn(
                  "mb-4 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger",
                )}
              >
                {error}
              </div>
            )}

            {children}

            <p className="mt-6 text-center text-sm text-fg-muted">{footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
