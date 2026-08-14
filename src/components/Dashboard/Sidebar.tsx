import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArchiveBoxIcon,
  ArrowRightStartOnRectangleIcon,
  ChartBarIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ClockIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  PhotoIcon,
  PlusIcon,
  SpeakerWaveIcon,
  UserCircleIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { useAuth } from "../../context/auth-context";
import { useChatReset } from "../../context/chat-reset-context";
import { cn } from "../../lib/utils";

type SidebarProps = {
  isOpen: boolean;
  toggle: () => void;
  isMobile: boolean;
  /** Called when a nav link is followed, so the mobile drawer can close. */
  onNavigate?: () => void;
};

type NavItem = {
  name: string;
  path: string;
  icon: typeof PlusIcon;
  /** Stay highlighted for nested paths, not only an exact match. */
  matchPrefix?: boolean;
};

const BASE_ITEMS: NavItem[] = [
  { name: "New AI Chat", path: "/dashboard", icon: PlusIcon },
  { name: "Chat History", path: "/dashboard/history", icon: ClockIcon },
  { name: "AI TTS", path: "/dashboard/tts", icon: SpeakerWaveIcon },
  { name: "AI Images", path: "/dashboard/images", icon: PhotoIcon },
  { name: "AI Avatar", path: "/dashboard/avatar", icon: UserCircleIcon },
  { name: "Billing", path: "/dashboard/billing", icon: CreditCardIcon, matchPrefix: true },
];

const ADMIN_ITEMS: NavItem[] = [
  { name: "Overview Stats", path: "/dashboard/admin/stats", icon: ChartBarIcon },
  { name: "Manage Users", path: "/dashboard/admin/users", icon: UsersIcon },
  { name: "Manage Packages", path: "/dashboard/admin/packages", icon: ArchiveBoxIcon },
];

const SETTINGS_ITEM: NavItem = {
  name: "Settings",
  path: "/dashboard/settings",
  icon: Cog6ToothIcon,
};

export default function Sidebar({ isOpen, toggle, isMobile, onNavigate }: SidebarProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { triggerReset } = useChatReset();

  const navItems = useMemo(
    () => [...BASE_ITEMS, ...(user?.is_superuser ? ADMIN_ITEMS : []), SETTINGS_ITEM],
    [user?.is_superuser],
  );

  const showLabels = isOpen || isMobile;

  return (
    <>
      {/* Drawer scrim. Kept mounted and faded so opening and closing are
          symmetrical instead of the overlay popping in. */}
      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
            isOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={toggle}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Main navigation"
        aria-hidden={isMobile && !isOpen}
        className={cn(
          "z-50 flex flex-col overflow-hidden border-r border-blue-200 app-surface dark:border-gray-800",
          // Only transform and width animate — both are cheap to composite.
          "transition-[transform,width] duration-300 ease-out motion-reduce:transition-none",
          isMobile
            ? cn(
                "fixed inset-y-0 left-0 w-[17rem] max-w-[85vw] shadow-2xl",
                isOpen ? "translate-x-0" : "-translate-x-full",
              )
            : cn("sticky top-0 h-dvh shrink-0", isOpen ? "w-64" : "w-20"),
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-blue-200 dark:border-gray-800",
            showLabels ? "justify-between px-4" : "justify-center",
          )}
        >
          {showLabels && (
            <Link
              to="/"
              className="truncate bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-lg font-bold text-transparent dark:from-blue-400 dark:to-pink-500"
            >
              MultiAiModel
            </Link>
          )}

          <button
            type="button"
            onClick={toggle}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-100 hover:text-blue-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-white"
            aria-label={
              isMobile ? "Close navigation" : isOpen ? "Collapse sidebar" : "Expand sidebar"
            }
          >
            {isMobile ? (
              <XMarkIcon className="h-6 w-6" />
            ) : isOpen ? (
              <ChevronDoubleLeftIcon className="h-5 w-5" />
            ) : (
              <ChevronDoubleRightIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav className="custom-scrollbar mt-4 flex-1 space-y-1.5 overflow-y-auto px-3">
          {navItems.map((item) => {
            const isActive = item.matchPrefix
              ? pathname.startsWith(item.path)
              : pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                title={showLabels ? undefined : item.name}
                onClick={() => {
                  if (item.path === "/dashboard") triggerReset();
                  onNavigate?.();
                }}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-3",
                  isActive
                    ? "bg-blue-100 text-blue-900 shadow-sm dark:bg-gray-800 dark:text-white"
                    : "text-slate-500 hover:bg-blue-100/60 hover:text-blue-900 dark:text-gray-400 dark:hover:bg-gray-800/40 dark:hover:text-white",
                  !showLabels && "justify-center",
                )}
              >
                <item.icon
                  className={cn(
                    "h-6 w-6 shrink-0",
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "group-hover:text-blue-600 dark:group-hover:text-blue-400",
                  )}
                />
                {showLabels && <span className="truncate text-sm font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Account. The bottom padding respects the iOS home indicator. */}
        <div className="shrink-0 border-t border-blue-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-800">
          <div className={cn("flex items-center gap-3", !showLabels && "justify-center")}>
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg",
                user?.is_superuser
                  ? "bg-gradient-to-tr from-red-500 to-orange-500"
                  : "bg-gradient-to-tr from-purple-500 to-blue-500",
              )}
              title={user?.email}
            >
              {/* charAt keeps this safe for an empty email, where [0] was undefined. */}
              {user?.email?.charAt(0).toUpperCase() || "?"}
            </div>

            {showLabels && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {user?.email}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={logout}
                    className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                  >
                    <ArrowRightStartOnRectangleIcon className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                  {user?.is_superuser && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-500 dark:bg-red-400/10 dark:text-red-400">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
