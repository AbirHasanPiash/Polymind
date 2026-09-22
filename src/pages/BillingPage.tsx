import { useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";

import api, { fetcher, getErrorMessage } from "../api/client";
import type { Package, Transaction } from "../api/types";
import { Button } from "../components/ui/button";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Page,
  PageHeader,
  Segmented,
  Skeleton,
} from "../components/ui/primitives";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { useFeatures } from "../hooks/useFeatures";
import { formatCredits, formatCurrency, formatDate, formatTime, toNumber } from "../lib/format";
import { cn } from "../lib/utils";
import type { RazorpayFailureResponse, RazorpayOptions, RazorpaySuccessResponse } from "../types/razorpay";

type Gateway = "stripe" | "razorpay";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

/** Loads the Razorpay checkout script once; resolves false when it cannot load. */
function loadRazorpay(): Promise<boolean> {
  if (typeof window.Razorpay !== "undefined") return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const STATUS_META: Record<Transaction["status"], { label: string; tone: "success" | "warning" | "danger"; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", tone: "success", icon: CheckCircle2 },
  pending: { label: "Pending", tone: "warning", icon: Clock },
  failed: { label: "Failed", tone: "danger", icon: XCircle },
};

function StatusBadge({ status }: { status: Transaction["status"] }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <Badge tone={meta.tone}>
      <meta.icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

export default function BillingPage() {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const { features } = useFeatures();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<Gateway>("stripe");

  const { data: packages, isLoading: loadingPackages, error: packagesError } = useSWR<Package[]>("/packages/", fetcher);
  const {
    data: transactions,
    isLoading: loadingHistory,
    mutate: mutateTransactions,
  } = useSWR<Transaction[]>("/payments/history", fetcher);

  // Derived, not stored: the choice can never point at a gateway the server
  // has not configured.
  const availableGateways: Gateway[] = (["stripe", "razorpay"] as Gateway[]).filter((gateway) => features[gateway]);
  const gateway: Gateway | null = availableGateways.includes(selectedGateway)
    ? selectedGateway
    : (availableGateways[0] ?? null);

  const activePackages = (packages ?? []).filter((pkg) => pkg.is_active);
  const credits = toNumber(user?.wallet?.credits);

  const purchase = async (pkg: Package) => {
    if (!gateway || purchasingId) return;
    setPurchasingId(pkg.id);

    try {
      if (gateway === "stripe") {
        const { data } = await api.post<{ checkout_url?: string }>(`/payments/create-checkout-session/${pkg.id}`);
        if (!data.checkout_url) throw new Error("Stripe did not return a checkout page");
        window.location.assign(data.checkout_url);
        return; // the page navigates away; leave the button in its loading state
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Could not load the Razorpay checkout. Check your connection.");
        setPurchasingId(null);
        return;
      }

      const { data: order } = await api.post<{ order_id: string; amount: number; currency: string; key_id: string }>(
        `/payments/create-razorpay-order/${pkg.id}`,
      );

      const options: RazorpayOptions = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Polymind",
        description: `${pkg.name} · ${formatCredits(pkg.credits)} credits`,
        order_id: order.order_id,
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            await api.post("/payments/verify-razorpay-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Payment successful — credits added to your wallet");
            void mutateTransactions();
            await refreshProfile();
          } catch (error) {
            toast.error(getErrorMessage(error, "Payment verification failed. Please contact support."));
          } finally {
            setPurchasingId(null);
          }
        },
        prefill: { email: user?.email, name: user?.full_name ?? undefined },
        theme: { color: "#7c3aed" },
        modal: { ondismiss: () => setPurchasingId(null) },
      };

      const checkout = new window.Razorpay(options);
      checkout.on("payment.failed", (response: RazorpayFailureResponse) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setPurchasingId(null);
      });
      checkout.open();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not start checkout. Please try again."));
      setPurchasingId(null);
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Account"
        title="Billing"
        description="One wallet for every model and studio. Credits never expire."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/usage">
              <BarChart3 />
              View usage
            </Link>
          </Button>
        }
      />

      {/* Wallet */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-lg shadow-accent/20 lg:col-span-1">
          <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/15 blur-3xl" aria-hidden="true" />
          <div className="relative flex h-full flex-col justify-between gap-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-white/80 uppercase">Balance</p>
                <p className="mt-2 font-mono text-4xl font-semibold tracking-tight tabular-nums">{formatCredits(credits)}</p>
                <p className="mt-1 text-sm text-white/80">credits available</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Wallet className="h-5 w-5" />
              </span>
            </div>
            <div className="text-xs text-white/80">
              <p className="truncate">{user?.email}</p>
              {credits <= 1 && <p className="mt-1 font-semibold text-white">Running low — pick a package to keep going.</p>}
            </div>
          </div>
        </div>

        <Card className="lg:col-span-2">
          <CardBody className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Secure checkout", body: "Cards are handled by Stripe or Razorpay. We never see your card." },
              { icon: Zap, title: "Instant delivery", body: "Credits land in your wallet the moment the payment settles." },
              { icon: Sparkles, title: "Fair metering", body: "Pay for the tokens, images and seconds you actually use — no seats." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{item.body}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Packages */}
      <section className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-fg">Credit packages</h2>
            <p className="text-sm text-fg-muted">Choose a bundle, then pay with the gateway you prefer.</p>
          </div>
          {availableGateways.length > 1 && gateway && (
            <Segmented<Gateway>
              aria-label="Payment method"
              size="md"
              value={gateway}
              onChange={setSelectedGateway}
              options={[
                {
                  value: "stripe",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" /> Stripe
                    </span>
                  ),
                },
                {
                  value: "razorpay",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <Landmark className="h-3.5 w-3.5" /> Razorpay
                    </span>
                  ),
                },
              ]}
            />
          )}
        </div>

        {!gateway ? (
          <EmptyState
            className="mt-4"
            icon={<CreditCard className="h-6 w-6" />}
            title="Payments are not set up yet"
            description="No payment gateway is configured on this server, so packages cannot be purchased right now."
          />
        ) : packagesError ? (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
            Could not load the packages. Please refresh the page.
          </div>
        ) : loadingPackages ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : activePackages.length === 0 ? (
          <EmptyState className="mt-4" title="No packages available" description="Check back soon — new bundles are on the way." />
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activePackages.map((pkg) => {
              const price = toNumber(pkg.price);
              const packCredits = toNumber(pkg.credits);
              const perCredit = packCredits > 0 ? price / packCredits : 0;
              const busy = purchasingId === pkg.id;
              return (
                <Card
                  key={pkg.id}
                  className={cn(
                    "relative flex flex-col p-6 transition hover:-translate-y-0.5",
                    pkg.is_featured && "border-accent/50 ring-1 ring-accent/30",
                  )}
                >
                  {pkg.is_featured && (
                    <Badge tone="accent" className="absolute -top-2.5 left-5">
                      <Sparkles className="h-3 w-3" /> Most popular
                    </Badge>
                  )}
                  <h3 className="text-base font-semibold text-fg">{pkg.name}</h3>
                  <p className="mt-1 min-h-[2.5rem] text-sm text-fg-muted line-clamp-2">
                    {pkg.description || `${formatCredits(packCredits)} credits for your wallet.`}
                  </p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight text-fg">{formatCurrency(price, pkg.currency ?? "USD")}</span>
                    <span className="text-xs text-fg-subtle uppercase">{pkg.currency ?? "USD"}</span>
                  </div>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-fg-muted">
                    <li className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-accent" />
                      <span className="font-medium text-fg">{formatCredits(packCredits)} credits</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {formatCurrency(perCredit, pkg.currency ?? "USD")} per credit
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Works across chat, images, voice and video
                    </li>
                  </ul>
                  <Button
                    variant={pkg.is_featured ? "gradient" : "primary"}
                    size="lg"
                    className="mt-6 w-full"
                    loading={busy}
                    disabled={purchasingId !== null && !busy}
                    onClick={() => void purchase(pkg)}
                  >
                    {busy ? "Opening checkout…" : `Buy with ${gateway === "stripe" ? "Stripe" : "Razorpay"}`}
                    {!busy && <ArrowUpRight />}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Transactions */}
      <Card className="mt-10">
        <CardHeader title="Transaction history" description="Every checkout you started, and how it ended." />
        <CardBody className="pt-3">
          {loadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <EmptyState className="py-10" icon={<CreditCard className="h-6 w-6" />} title="No purchases yet" description="Your first top-up will appear here." />
          ) : (
            <>
              {/* Table on sm+ */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs font-semibold tracking-wider text-fg-muted uppercase">
                      <th className="py-2.5 pr-4">Date</th>
                      <th className="py-2.5 pr-4">Gateway</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5 pr-4 text-right">Amount</th>
                      <th className="py-2.5 text-right">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-surface-2/60">
                        <td className="py-3 pr-4 text-fg">
                          {formatDate(tx.created_at)}
                          <span className="ml-2 text-xs text-fg-subtle">{formatTime(tx.created_at)}</span>
                        </td>
                        <td className="py-3 pr-4 text-fg-muted capitalize">{tx.payment_gateway ?? "stripe"}</td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={tx.status} />
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-fg tabular-nums">{formatCurrency(tx.amount, tx.currency || "USD")}</td>
                        <td className="py-3 text-right font-mono text-accent tabular-nums">+{formatCredits(tx.credits_added)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards on phones */}
              <ul className="space-y-2 sm:hidden">
                {transactions.map((tx) => (
                  <li key={tx.id} className="rounded-xl border border-line bg-surface-2/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-fg">{formatDate(tx.created_at)}</span>
                      <StatusBadge status={tx.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-fg-muted capitalize">{tx.payment_gateway ?? "stripe"}</span>
                      <span className="font-mono text-fg tabular-nums">{formatCurrency(tx.amount, tx.currency || "USD")}</span>
                    </div>
                    <p className="mt-1 text-right font-mono text-xs text-accent tabular-nums">+{formatCredits(tx.credits_added)} credits</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
