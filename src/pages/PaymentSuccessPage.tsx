import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, MessageSquareText } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/primitives";
import { useAuth } from "../context/auth-context";
import { formatCredits } from "../lib/format";

const REDIRECT_SECONDS = 6;

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    // Credits are granted by Stripe's webhook, which can land a moment after
    // the browser is redirected here. Re-checking on each tick means the
    // balance appears as soon as it settles.
    const timer = setInterval(() => {
      void refreshProfile();
      setCountdown((remaining) => {
        if (remaining <= 1) {
          clearInterval(timer);
          navigate("/dashboard/billing", { replace: true });
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, refreshProfile]);

  const sessionId = searchParams.get("session_id");

  return (
    <div className="custom-scrollbar flex h-full items-center justify-center overflow-y-auto px-4 py-8">
      <Card className="w-full max-w-md p-6 text-center animate-rise-in sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-8 w-8 animate-scale-in" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">Payment successful</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Thank you. Your credits are being added to your wallet — the balance updates automatically.
        </p>

        <div className="mt-6 rounded-xl border border-line bg-surface-2/60 p-4">
          <p className="text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Current balance</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-fg tabular-nums">{formatCredits(user?.wallet?.credits)} credits</p>
          {sessionId && (
            <p className="mt-3 truncate font-mono text-[11px] text-fg-subtle" title={sessionId}>
              Ref {sessionId}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="primary" size="lg" className="flex-1">
            <Link to="/dashboard">
              <MessageSquareText />
              Start chatting
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link to="/dashboard/billing">
              Billing
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <p className="mt-5 text-xs text-fg-subtle">
          Returning to billing in <span className="font-mono font-semibold text-fg">{countdown}</span> second{countdown === 1 ? "" : "s"}…
        </p>
      </Card>
    </div>
  );
}
