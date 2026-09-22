import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Coins } from "lucide-react";

import { useAuth } from "../../context/auth-context";
import { formatCost, formatCredits, toNumber } from "../../lib/format";
import { cn } from "../../lib/utils";

/**
 * The price of the next generation, next to the wallet it will come out of.
 *
 * `credits` is null when nothing can be priced yet (no prompt, no model); the
 * row still renders so the layout does not jump when it becomes available.
 */
export function CostEstimate({
  credits,
  unit,
  note,
  className,
}: {
  credits: number | null;
  unit?: string;
  note?: ReactNode;
  className?: string;
}) {
  const { user } = useAuth();
  const balance = toNumber(user?.wallet?.credits);
  const insufficient = credits !== null && credits > balance;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs",
          insufficient ? "border-danger/30 bg-danger/5" : "border-line bg-surface-2/60",
        )}
      >
        <span className="flex items-center gap-1.5 text-fg-muted">
          <Coins className={cn("h-3.5 w-3.5", insufficient ? "text-danger" : "text-accent")} />
          Estimated cost
        </span>
        <span className="font-mono tabular-nums text-fg">
          {credits === null ? "—" : `≈ ${formatCost(credits)} cr`}
          {unit && credits !== null && <span className="text-fg-subtle"> / {unit}</span>}
          <span className="ml-2 text-fg-subtle">· balance {formatCredits(balance)}</span>
        </span>
      </div>
      {insufficient ? (
        <p className="flex items-center gap-1.5 text-xs text-danger">
          <AlertTriangle className="h-3.5 w-3.5" />
          Not enough credits for this.{" "}
          <Link to="/dashboard/billing" className="font-medium underline underline-offset-2">
            Top up
          </Link>
        </p>
      ) : note ? (
        <p className="text-xs text-fg-subtle">{note}</p>
      ) : null}
    </div>
  );
}
