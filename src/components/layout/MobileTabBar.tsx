import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";

import { cn } from "../../lib/utils";
import { ACCOUNT_NAV, PRIMARY_NAV, isNavActive } from "./nav";

/** Bottom navigation for phones: the four destinations people reach for most. */
export default function MobileTabBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation();
  const items = [PRIMARY_NAV[0], PRIMARY_NAV[1], PRIMARY_NAV[2], ACCOUNT_NAV[0]];

  return (
    <nav
      aria-label="Quick navigation"
      className="glass fixed inset-x-0 bottom-0 z-30 flex border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map((item) => {
        const active = isNavActive(item, pathname);
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
              active ? "text-accent" : "text-fg-subtle hover:text-fg",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.short ?? item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-fg-subtle hover:text-fg"
      >
        <Menu className="h-5 w-5" />
        Menu
      </button>
    </nav>
  );
}
