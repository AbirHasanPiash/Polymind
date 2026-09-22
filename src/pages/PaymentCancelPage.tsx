import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, XCircle } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/primitives";

export default function PaymentCancelPage() {
  return (
    <div className="custom-scrollbar flex h-full items-center justify-center overflow-y-auto px-4 py-8">
      <Card className="w-full max-w-md p-6 text-center animate-rise-in sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
          <XCircle className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">Payment cancelled</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">No charge was made. You can pick a package again whenever you are ready.</p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="primary" size="lg" className="flex-1">
            <Link to="/dashboard/billing">
              <ArrowLeft />
              Back to billing
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link to="/dashboard">Go to chat</Link>
          </Button>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-fg-subtle">
          <ShieldCheck className="h-3.5 w-3.5" />
          Your payment details were never stored by Polymind.
        </p>
      </Card>
    </div>
  );
}
