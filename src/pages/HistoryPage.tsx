import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useSWR from "swr";
import { Clock, Columns2, MessageSquareText, Pencil, Pin, PinOff, Plus, Search, Trash2, X } from "lucide-react";

import { fetcher, getErrorMessage } from "../api/client";
import type { ChatSummary, SearchHit } from "../api/types";
import { Button } from "../components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogFooter, Tooltip } from "../components/ui/overlays";
import { Badge, Card, CardBody, EmptyState, Input, Page, PageHeader, Skeleton } from "../components/ui/primitives";
import { useChatReset } from "../context/chat-reset-context";
import { useToast } from "../context/toast-context";
import { useChats } from "../hooks/useChats";
import { dayBucket, formatRelativeTime } from "../lib/format";
import { cn } from "../lib/utils";

const BUCKET_ORDER = ["Pinned", "Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];
const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

/** Emphasise the matched term inside a snippet. */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-accent-soft px-0.5 text-accent">{text.slice(index, index + term.length)}</mark>
      {text.slice(index + term.length)}
    </>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { triggerReset } = useChatReset();
  const { chats, isLoading, error, rename, setPinned, remove } = useChats();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [renaming, setRenaming] = useState<ChatSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<ChatSummary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const searching = debounced.length >= MIN_QUERY;
  const { data: hits, isLoading: searchLoading } = useSWR<SearchHit[]>(
    searching ? `/chat/search?q=${encodeURIComponent(debounced)}` : null,
    fetcher,
    { keepPreviousData: true },
  );

  const grouped = useMemo(() => {
    const buckets = new Map<string, ChatSummary[]>();
    for (const chat of chats) {
      const key = chat.pinned ? "Pinned" : dayBucket(chat.updated_at ?? chat.created_at);
      buckets.set(key, [...(buckets.get(key) ?? []), chat]);
    }
    return BUCKET_ORDER.filter((key) => buckets.has(key)).map((key) => ({ key, chats: buckets.get(key)! }));
  }, [chats]);

  const startNewChat = () => {
    triggerReset();
    navigate("/dashboard");
  };

  const submitRename = async () => {
    if (!renaming) return;
    const title = renameValue.trim();
    if (!title) return;
    setBusy(true);
    try {
      await rename(renaming.id, title);
      setRenaming(null);
      toast.success("Conversation renamed");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not rename the conversation"));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await remove(deleting.id);
      setDeleting(null);
      toast.success("Conversation deleted");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the conversation"));
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (chat: ChatSummary) => {
    try {
      await setPinned(chat.id, !chat.pinned);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update the conversation"));
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Account"
        title="History"
        description="Every conversation you have had, and a search across all of their messages."
        actions={
          <Button onClick={startNewChat} size="sm">
            <Plus />
            New chat
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mt-6">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your messages and titles…"
          aria-label="Search conversations"
          className="h-11 pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {searching ? (
        <Card className="mt-4">
          <CardBody className="pt-4">
            <p className="mb-3 text-xs font-semibold tracking-wider text-fg-subtle uppercase">
              {searchLoading && !hits ? "Searching…" : `${hits?.length ?? 0} ${hits?.length === 1 ? "match" : "matches"}`}
            </p>
            {searchLoading && !hits ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : hits && hits.length > 0 ? (
              <ul className="divide-y divide-line">
                {hits.map((hit) => (
                  <li key={hit.message_id}>
                    <Link
                      to={`/dashboard/chat/${hit.chat_id}`}
                      className="-mx-2 flex flex-col gap-1 rounded-lg px-2 py-3 hover:bg-surface-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-fg">{hit.chat_title || "Untitled"}</span>
                        <Badge tone={hit.role === "user" ? "accent" : "neutral"}>{hit.role === "user" ? "You" : "Assistant"}</Badge>
                        <span className="ml-auto text-xs text-fg-subtle">{formatRelativeTime(hit.created_at)}</span>
                      </div>
                      <p className="text-sm text-fg-muted line-clamp-2">
                        <Highlight text={hit.snippet} term={debounced} />
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState className="py-8" icon={<Search className="h-6 w-6" />} title="No matches" description={`Nothing in your conversations mentions “${debounced}”.`} />
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6">
          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
              Could not load your conversations. Please refresh the page.
            </div>
          )}

          {isLoading && chats.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <EmptyState
              icon={<MessageSquareText className="h-6 w-6" />}
              title="No conversations yet"
              description="Start your first chat and it will be kept here for you."
              action={
                <Button onClick={startNewChat}>
                  <Plus />
                  Start a chat
                </Button>
              }
            />
          ) : (
            <div className="space-y-8">
              {grouped.map((group) => (
                <section key={group.key}>
                  <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                    {group.key === "Pinned" ? <Pin className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {group.key}
                    <span className="font-normal text-fg-subtle">· {group.chats.length}</span>
                  </h2>
                  <ul className="space-y-2">
                    {group.chats.map((chat) => (
                      <li key={chat.id}>
                        <Card className="group flex items-center gap-3 px-3 py-2.5 transition hover:border-line-strong sm:px-4">
                          <Link to={`/dashboard/chat/${chat.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                            <span
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                chat.mode === "arena" ? "bg-brand-3/10 text-brand-3" : "bg-accent-soft text-accent",
                              )}
                            >
                              {chat.mode === "arena" ? <Columns2 className="h-5 w-5" /> : <MessageSquareText className="h-5 w-5" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium text-fg group-hover:text-accent">{chat.title || "Untitled"}</span>
                                {chat.mode === "arena" && <Badge className="hidden bg-brand-3/15 text-brand-3 sm:inline-flex">Arena</Badge>}
                              </span>
                              <span className="mt-0.5 block text-xs text-fg-subtle">
                                {chat.message_count} {chat.message_count === 1 ? "message" : "messages"} · {formatRelativeTime(chat.updated_at ?? chat.created_at)}
                              </span>
                            </span>
                          </Link>

                          <div className="flex shrink-0 items-center gap-0.5">
                            <Tooltip content={chat.pinned ? "Unpin" : "Pin"}>
                              <button
                                type="button"
                                onClick={() => void togglePin(chat)}
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-2",
                                  chat.pinned ? "text-accent" : "text-fg-subtle hover:text-fg",
                                )}
                                aria-label={chat.pinned ? "Unpin conversation" : "Pin conversation"}
                              >
                                {chat.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                              </button>
                            </Tooltip>
                            <Tooltip content="Rename">
                              <button
                                type="button"
                                onClick={() => {
                                  setRenaming(chat);
                                  setRenameValue(chat.title ?? "");
                                }}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg"
                                aria-label="Rename conversation"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Delete">
                              <button
                                type="button"
                                onClick={() => setDeleting(chat)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-fg-subtle hover:bg-danger/10 hover:text-danger"
                                aria-label="Delete conversation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          </div>
                        </Card>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && !busy && setRenaming(null)}>
        <DialogContent title="Rename conversation" size="sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitRename();
            }}
          >
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              maxLength={120}
              autoFocus
              aria-label="Conversation title"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" loading={busy} disabled={!renameValue.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this conversation?"
        description={`“${deleting?.title || "Untitled"}” and all of its messages will be permanently removed.`}
        loading={busy}
        onConfirm={confirmDelete}
      />
    </Page>
  );
}
