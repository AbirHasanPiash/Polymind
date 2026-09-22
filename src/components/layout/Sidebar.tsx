import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Columns2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import type { ChatSummary } from "../../api/types";
import { useAuth } from "../../context/auth-context";
import { useChatReset } from "../../context/chat-reset-context";
import { useToast } from "../../context/toast-context";
import { useChats } from "../../hooks/useChats";
import { MOD_KEY } from "../../hooks/useHotkeys";
import { dayBucket, formatCredits } from "../../lib/format";
import { cn } from "../../lib/utils";
import { BrandMark, Wordmark } from "../brand/BrandMark";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ConfirmDialog, Dialog, DialogContent, DialogFooter, Tooltip } from "../ui/overlays";
import { Avatar, Input, Kbd } from "../ui/primitives";
import { ACCOUNT_NAV, ADMIN_NAV, SIDEBAR_PRIMARY_NAV, isNavActive, type NavItem } from "./nav";

type SidebarProps = {
  isOpen: boolean;
  toggle: () => void;
  isMobile: boolean;
  onNavigate?: () => void;
  onOpenPalette: () => void;
};

const BUCKET_ORDER = ["Pinned", "Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];
/** Conversations shown before the "show more" control. */
const RECENT_PREVIEW = 5;

export default function Sidebar({ isOpen, toggle, isMobile, onNavigate, onOpenPalette }: SidebarProps) {
  const { pathname } = useLocation();
  const { chatId: activeChatId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { triggerReset } = useChatReset();
  const { chats, rename, setPinned, remove } = useChats();
  const toast = useToast();

  const [showAllRecent, setShowAllRecent] = useState(false);
  const [renaming, setRenaming] = useState<ChatSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<ChatSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const expanded = isOpen || isMobile;

  // The list arrives pinned-first, then most recently active, so the preview
  // is simply its head.
  const visibleChats = showAllRecent ? chats : chats.slice(0, RECENT_PREVIEW);
  const hiddenCount = chats.length - visibleChats.length;

  const grouped = useMemo(() => {
    const buckets = new Map<string, ChatSummary[]>();
    for (const chat of visibleChats) {
      const key = chat.pinned ? "Pinned" : dayBucket(chat.updated_at ?? chat.created_at);
      buckets.set(key, [...(buckets.get(key) ?? []), chat]);
    }
    return BUCKET_ORDER.filter((key) => buckets.has(key)).map((key) => ({ key, chats: buckets.get(key)! }));
  }, [visibleChats]);

  const startNewChat = () => {
    triggerReset();
    navigate("/dashboard");
    onNavigate?.();
  };

  const openChat = (chat: ChatSummary) => {
    navigate(`/dashboard/chat/${chat.id}`);
    onNavigate?.();
  };

  const submitRename = async () => {
    if (!renaming) return;
    const title = renameValue.trim();
    if (!title) return;
    setBusy(true);
    try {
      await rename(renaming.id, title);
      setRenaming(null);
    } catch {
      toast.error("Could not rename the conversation");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await remove(deleting.id);
      if (activeChatId === deleting.id) {
        triggerReset();
        navigate("/dashboard", { replace: true });
      }
      setDeleting(null);
      toast.success("Conversation deleted");
    } catch {
      toast.error("Could not delete the conversation");
    } finally {
      setBusy(false);
    }
  };

  const renderNav = (items: NavItem[]) =>
    items.map((item) => {
      const active = isNavActive(item, pathname);
      const link = (
        <Link
          key={item.path}
          to={item.path}
          aria-current={active ? "page" : undefined}
          onClick={() => onNavigate?.()}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium",
            active ? "bg-accent-soft text-accent" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
            !expanded && "justify-center px-0",
          )}
        >
          <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-accent" : "text-fg-subtle group-hover:text-fg")} />
          {expanded && <span className="truncate">{item.label}</span>}
        </Link>
      );
      return expanded ? link : <Tooltip key={item.path} content={item.label} side="right">{link}</Tooltip>;
    });

  return (
    <>
      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
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
          "z-50 flex flex-col overflow-hidden border-r border-line bg-surface",
          "transition-[transform,width] duration-300 ease-out motion-reduce:transition-none",
          isMobile
            ? cn("fixed inset-y-0 left-0 w-[18rem] max-w-[86vw] shadow-2xl", isOpen ? "translate-x-0" : "-translate-x-full")
            : cn("sticky top-0 h-dvh shrink-0", isOpen ? "w-[17rem]" : "w-[4.25rem]"),
        )}
      >
        {/* Brand row. Expanded: wordmark + collapse. Collapsed: the mark, which
            turns into the expand control on hover or keyboard focus. */}
        <div className={cn("flex h-14 shrink-0 items-center lg:h-16", expanded ? "justify-between px-4" : "justify-center")}>
          {expanded ? (
            <>
              <Link to="/" className="rounded-lg">
                <Wordmark />
              </Link>
              <button
                type="button"
                onClick={toggle}
                className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
                aria-label={isMobile ? "Close navigation" : "Collapse sidebar"}
              >
                {isMobile ? <X className="h-5 w-5" /> : <ChevronsLeft className="h-4.5 w-4.5" />}
              </button>
            </>
          ) : (
            <Tooltip content="Expand sidebar" side="right">
              <button
                type="button"
                onClick={toggle}
                aria-label="Expand sidebar"
                className="group relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface-2"
              >
                <BrandMark className="h-8 w-8 transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0" />
                <ChevronsRight className="absolute h-5 w-5 text-fg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
              </button>
            </Tooltip>
          )}
        </div>

        {/* Primary actions */}
        <div className={cn("space-y-1.5 px-3", !expanded && "px-2")}>
          {expanded ? (
            <button
              type="button"
              onClick={startNewChat}
              className="flex h-10 w-full items-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-accent-fg shadow-sm hover:bg-accent-strong"
            >
              <Plus className="h-4 w-4" />
              New chat
              <span className="ml-auto hidden items-center gap-0.5 lg:flex">
                <Kbd className="border-accent-fg/20 bg-accent-fg/10 text-accent-fg/80">{MOD_KEY}</Kbd>
                <Kbd className="border-accent-fg/20 bg-accent-fg/10 text-accent-fg/80">⇧O</Kbd>
              </span>
            </button>
          ) : (
            <Tooltip content="New chat" side="right">
              <button
                type="button"
                onClick={startNewChat}
                className="flex h-10 w-full items-center justify-center rounded-xl bg-accent text-accent-fg hover:bg-accent-strong"
                aria-label="New chat"
              >
                <Plus className="h-4.5 w-4.5" />
              </button>
            </Tooltip>
          )}

          {expanded ? (
            <button
              type="button"
              onClick={onOpenPalette}
              className="flex h-9 w-full items-center gap-2 rounded-xl border border-line px-3 text-sm text-fg-subtle hover:border-line-strong hover:text-fg"
            >
              <Search className="h-4 w-4" />
              Search
              <span className="ml-auto hidden items-center gap-0.5 lg:flex">
                <Kbd>{MOD_KEY}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
          ) : (
            <Tooltip content="Search" side="right">
              <button
                type="button"
                onClick={onOpenPalette}
                className="flex h-9 w-full items-center justify-center rounded-xl text-fg-subtle hover:bg-surface-2 hover:text-fg"
                aria-label="Search"
              >
                <Search className="h-4.5 w-4.5" />
              </button>
            </Tooltip>
          )}
        </div>

        <nav className={cn("custom-scrollbar mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4", !expanded && "px-2")}>
          <div className="space-y-0.5">
            {expanded && <p className="mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Studios</p>}
            {renderNav(SIDEBAR_PRIMARY_NAV)}
          </div>

          {expanded && chats.length > 0 && (
            <div>
              <p className="mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Recent</p>
              {grouped.map((group) => (
                <div key={group.key} className="mb-2">
                  {group.key === "Pinned" ? (
                    <p className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-fg-subtle">
                      <Pin className="h-3 w-3" /> Pinned
                    </p>
                  ) : (
                    <p className="px-2.5 py-1 text-[11px] text-fg-subtle">{group.key}</p>
                  )}
                  <ul className="space-y-0.5">
                    {group.chats.map((chat) => {
                      const active = chat.id === activeChatId;
                      return (
                        <li key={chat.id} className="group relative">
                          <button
                            type="button"
                            onClick={() => openChat(chat)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg py-1.5 pr-8 pl-2.5 text-left text-[13px]",
                              active ? "bg-surface-2 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                            )}
                          >
                            {chat.mode === "arena" && <Columns2 className="h-3.5 w-3.5 shrink-0 text-brand-3" />}
                            <span className="truncate">{chat.title || "Untitled"}</span>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label="Conversation actions"
                                className={cn(
                                  "absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-1 text-fg-subtle hover:bg-surface-3 hover:text-fg",
                                  "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 data-[state=open]:opacity-100",
                                )}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="surface-pop min-w-[10rem] rounded-xl p-1">
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 rounded-lg text-fg focus:bg-surface-2"
                                onClick={() => void setPinned(chat.id, !chat.pinned)}
                              >
                                {chat.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                                {chat.pinned ? "Unpin" : "Pin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 rounded-lg text-fg focus:bg-surface-2"
                                onClick={() => {
                                  setRenaming(chat);
                                  setRenameValue(chat.title ?? "");
                                }}
                              >
                                <Pencil className="h-4 w-4" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-line" />
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 rounded-lg text-danger focus:bg-danger/10 focus:text-danger"
                                onClick={() => setDeleting(chat)}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {chats.length > RECENT_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllRecent((value) => !value)}
                  aria-expanded={showAllRecent}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-fg-subtle hover:bg-surface-2 hover:text-fg"
                >
                  {showAllRecent ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showAllRecent ? "Show less" : `Show ${hiddenCount} more`}
                </button>
              )}
            </div>
          )}

          <div className="space-y-0.5">
            {expanded && <p className="mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Account</p>}
            {renderNav(ACCOUNT_NAV)}
          </div>

          {user?.is_superuser && (
            <div className="space-y-0.5">
              {expanded && (
                <p className="mb-1 flex items-center gap-1 px-2.5 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </p>
              )}
              {renderNav(ADMIN_NAV)}
            </div>
          )}
        </nav>

        {/* Account footer */}
        <div className={cn("shrink-0 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]", !expanded && "px-2")}>
          {expanded ? (
            <div className="flex items-center gap-1">
              <Link
                to="/dashboard/settings"
                onClick={onNavigate}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 hover:bg-surface-2"
              >
                <Avatar name={user?.full_name || user?.email} admin={user?.is_superuser} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-fg">{user?.full_name || user?.email}</span>
                  <span className="block truncate font-mono text-[11px] text-fg-muted">
                    {formatCredits(user?.wallet?.credits)} credits
                  </span>
                </span>
              </Link>
              <Tooltip content="Sign out">
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-xl p-2 text-fg-subtle hover:bg-surface-2 hover:text-danger"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Tooltip content={user?.email ?? "Account"} side="right">
                <Link to="/dashboard/settings" aria-label="Account settings" className="rounded-full">
                  <Avatar name={user?.full_name || user?.email} admin={user?.is_superuser} size="sm" />
                </Link>
              </Tooltip>
              <Tooltip content="Sign out" side="right">
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-danger"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent title="Rename conversation" size="sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitRename();
            }}
          >
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={120} autoFocus aria-label="Conversation title" />
            <DialogFooter>
              <button type="button" onClick={() => setRenaming(null)} className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-fg hover:bg-surface-2">
                Cancel
              </button>
              <button type="submit" disabled={busy || !renameValue.trim()} className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-strong disabled:opacity-50">
                Save
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this conversation?"
        description="All of its messages will be permanently removed."
        loading={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
