import { Bars3Icon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/auth-context";
import { formatCredits } from "../../lib/format";
import { ModeToggle } from "../mode-toggle";

type HeaderProps = {
  toggleSidebar: () => void;
  isMobile: boolean;
  /**
   * Show the wordmark here.
   *
   * The brand belongs in exactly one place at a time: the sidebar owns it while
   * it is open, and hands it to the header when it collapses (or, on mobile,
   * when the drawer is closed).
   */
  showBrand: boolean;
};

export default function Header({ toggleSidebar, isMobile, showBrand }: HeaderProps) {
  const { user } = useAuth();
  const credits = formatCredits(user?.wallet?.credits);
  const isLow = Number(user?.wallet?.credits ?? 0) <= 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-blue-200 bg-blue-50/85 px-3 backdrop-blur-md sm:px-4 lg:px-6 dark:border-gray-800 dark:bg-[#0a0b0f]/85">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {isMobile && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="-ml-1 rounded-md p-2 text-blue-700 hover:bg-blue-200 hover:text-blue-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Open navigation"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        )}

        {showBrand && (
          <Link
            to="/"
            // Fades in as the sidebar collapses, so the hand-off reads as one
            // brand moving rather than a second one appearing.
            className="animate-fade-in truncate bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-lg font-bold text-transparent hover:opacity-80 md:text-xl dark:from-blue-400 dark:to-pink-500"
          >
            MultiAiModel
          </Link>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <Link
          to="/dashboard/billing"
          className="flex items-center gap-2 whitespace-nowrap rounded-full border border-blue-200 bg-white px-3 py-1.5 shadow-sm hover:border-blue-300 sm:px-4 dark:border-gray-700/50 dark:bg-[#1a1d26] dark:hover:border-gray-600"
          title={isLow ? "You are out of credits — tap to top up" : "Credit balance"}
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isLow ? "bg-rose-500" : "animate-pulse bg-emerald-500 dark:bg-emerald-400"
            }`}
            aria-hidden="true"
          />
          <span className="font-mono text-xs text-blue-900 dark:text-gray-300">
            {credits}
            <span className="ml-1 hidden text-blue-500 sm:inline dark:text-gray-500">credits</span>
          </span>
        </Link>

        <ModeToggle />
      </div>
    </header>
  );
}
