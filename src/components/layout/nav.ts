import {
  AudioLines,
  BarChart3,
  Clapperboard,
  CreditCard,
  ImageIcon,
  MessageSquareText,
  Package,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Stay highlighted for nested paths, not only an exact match. */
  matchPrefix?: boolean;
  /** Short label for the mobile tab bar. */
  short?: string;
};

export const PRIMARY_NAV: NavItem[] = [
  { label: "Chat", path: "/dashboard", icon: MessageSquareText, short: "Chat" },
  { label: "Images", path: "/dashboard/images", icon: ImageIcon, short: "Images" },
  { label: "Voice", path: "/dashboard/voice", icon: AudioLines, short: "Voice" },
  { label: "Avatar video", path: "/dashboard/avatar", icon: Clapperboard, short: "Avatar" },
];

/** The sidebar omits "Chat": the New chat button opens the same page. */
export const SIDEBAR_PRIMARY_NAV: NavItem[] = PRIMARY_NAV.slice(1);

export const ACCOUNT_NAV: NavItem[] = [
  { label: "Usage", path: "/dashboard/usage", icon: BarChart3, short: "Usage" },
  { label: "Billing", path: "/dashboard/billing", icon: Wallet, matchPrefix: true, short: "Billing" },
  { label: "Settings", path: "/dashboard/settings", icon: Settings, short: "Settings" },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Overview", path: "/dashboard/admin/stats", icon: BarChart3 },
  { label: "Users", path: "/dashboard/admin/users", icon: Users },
  { label: "Packages", path: "/dashboard/admin/packages", icon: Package },
  { label: "Transactions", path: "/dashboard/admin/transactions", icon: CreditCard },
];

export function isChatRoute(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/chat");
}

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.path === "/dashboard") return isChatRoute(pathname);
  return item.matchPrefix ? pathname.startsWith(item.path) : pathname === item.path;
}

export function pageTitle(pathname: string): string {
  const all = [...PRIMARY_NAV, ...ACCOUNT_NAV, ...ADMIN_NAV];
  const match = all.find((item) => isNavActive(item, pathname));
  if (match) return match.label;
  if (pathname.startsWith("/dashboard/history")) return "History";
  if (pathname.startsWith("/dashboard/payment")) return "Payment";
  return "Polymind";
}
