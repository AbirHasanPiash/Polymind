import { Link } from "react-router-dom";
import { Menu, Wallet } from "lucide-react";

import { useAuth } from "../../context/auth-context";
import { formatCredits } from "../../lib/format";
import { cn } from "../../lib/utils";
import { BrandMark } from "../brand/BrandMark";
import { ThemeToggle } from "./ThemeToggle";

type HeaderProps = {
  toggleSidebar: () => void;
  isMobile: boolean;
  /** Receives the element pages render their actions into (see HeaderPortal). */
  onSlotRef: (element: HTMLDivElement | null) => void;
};

/**
 * The single top bar.
 *
 * It carries only what is not already in the sidebar: page actions (through
 * the slot), the credit balance and the theme toggle. On phones, where the
 * sidebar is a closed drawer, it also shows the menu button and the mark.
 */
export default function Header({ toggleSidebar, isMobile, onSlotRef }: HeaderProps) {
  const { user } = useAuth();
  const credits = Number(user?.wallet?.credits ?? 0);
  const isLow = credits <= 1;

  return (
    <header className="glass sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line px-3 sm:px-4 lg:h-16 lg:px-6">
      <div className="flex min-w-0 shrink-0 items-center gap-1.5">
        {isMobile && (
          <>
            <button
              type="button"
              onClick={toggleSidebar}
              className="-ml-1 rounded-xl p-2 text-fg-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" aria-label="Polymind home" className="rounded-lg">
              <BrandMark className="h-7 w-7" />
            </Link>
          </>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        {/* Page actions land here (chat: status, instructions, share, more). */}
        <div ref={onSlotRef} className="flex min-w-0 items-center gap-0.5 sm:gap-1" />

        <Link
          to="/dashboard/billing"
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium sm:gap-2 sm:px-3",
            isLow ? "border-danger/30 bg-danger/10 text-danger" : "border-line bg-surface text-fg hover:border-line-strong",
          )}
          title={isLow ? "You are almost out of credits — tap to top up" : "Credit balance"}
        >
          <Wallet className={cn("h-3.5 w-3.5", isLow ? "text-danger" : "text-accent")} />
          <span className="font-mono tabular-nums">{formatCredits(credits)}</span>
          <span className="hidden text-fg-muted sm:inline">credits</span>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}
