import { useState } from "react";
import { Check, Columns2, Copy, Download, Link2, Link2Off, MoreHorizontal, Pencil, Pin, PinOff, SlidersHorizontal } from "lucide-react";

import api, { getErrorMessage } from "../../api/client";
import type { ChatSummary, ShareInfo } from "../../api/types";
import { useToast } from "../../context/toast-context";
import { cn } from "../../lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, Tooltip } from "../ui/overlays";
import { Badge, Input, Textarea } from "../ui/primitives";

type Props = {
  chatId: string | null;
  title: string | null;
  mode: "chat" | "arena";
  pinned: boolean;
  systemPrompt: string | null;
  shareToken: string | null;
  connected: boolean;
  onUpdate: (patch: Partial<ChatSummary>) => Promise<void>;
};

const PERSONAS: { label: string; prompt: string }[] = [
  { label: "Coding partner", prompt: "You are a senior software engineer. Prefer complete, runnable code, explain trade-offs briefly, and point out bugs or risks you notice." },
  { label: "Editor", prompt: "You are a sharp copy editor. Tighten prose, keep the author's voice, and explain notable changes in one line each." },
  { label: "Tutor", prompt: "You are a patient tutor. Check understanding with a short question before moving on, and use concrete examples." },
  { label: "Analyst", prompt: "You are a rigorous analyst. Lay out assumptions, show the reasoning, quantify where possible, and end with a clear recommendation." },
];

const iconButton = "inline-flex h-9 w-9 items-center justify-center rounded-xl text-fg-muted hover:bg-surface-2 hover:text-fg";

/**
 * The conversation's controls, rendered into the top bar through HeaderPortal:
 * connection status, per-chat instructions, sharing, and a menu with pin,
 * rename and export. On narrow screens the icon buttons fold into the menu.
 */
export function ChatActions({ chatId, title, mode, pinned, systemPrompt, shareToken, connected, onUpdate }: Props) {
  const toast = useToast();
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasChat = Boolean(chatId);

  const openRename = () => {
    setDraftTitle(title ?? "");
    setRenameOpen(true);
  };

  const saveTitle = async () => {
    const next = draftTitle.trim();
    if (!next || next === title) {
      setRenameOpen(false);
      return;
    }
    setBusy(true);
    try {
      await onUpdate({ title: next });
      setRenameOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not rename"));
    } finally {
      setBusy(false);
    }
  };

  const openInstructions = () => {
    setDraftPrompt(systemPrompt ?? "");
    setInstructionsOpen(true);
  };

  const saveInstructions = async () => {
    setBusy(true);
    try {
      await onUpdate({ system_prompt: draftPrompt.trim() || null });
      setInstructionsOpen(false);
      toast.success(draftPrompt.trim() ? "Instructions saved for this chat" : "Instructions cleared");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save instructions"));
    } finally {
      setBusy(false);
    }
  };

  const openShare = async () => {
    if (!chatId) return;
    setShareOpen(true);
    if (shareToken) {
      setShare({ share_token: shareToken, url: `${window.location.origin}/share/${shareToken}`, shared_at: null });
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<ShareInfo>(`/chat/${chatId}/share`);
      setShare({ ...data, url: `${window.location.origin}/share/${data.share_token}` });
      await onUpdate({ share_token: data.share_token });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not create a share link"));
      setShareOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const revokeShare = async () => {
    if (!chatId) return;
    setBusy(true);
    try {
      await api.delete(`/chat/${chatId}/share`);
      setShare(null);
      setShareOpen(false);
      await onUpdate({ share_token: null });
      toast.success("Share link disabled");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not disable the link"));
    } finally {
      setBusy(false);
    }
  };

  const copyShare = async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Your browser blocked clipboard access");
    }
  };

  const exportChat = async (format: "markdown" | "json") => {
    if (!chatId) return;
    try {
      const response = await api.get(`/chat/${chatId}/export`, { params: { format }, responseType: "blob" });
      const disposition: string = response.headers["content-disposition"] ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] ?? `conversation.${format === "json" ? "json" : "md"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(getErrorMessage(error, "Export failed"));
    }
  };

  return (
    <>
      {mode === "arena" && (
        <Tooltip content="Arena: several models answer side by side">
          <span className="mr-1 hidden sm:inline-flex">
            <Badge className="bg-brand-3/15 text-brand-3">
              <Columns2 className="h-3 w-3" /> Arena
            </Badge>
          </span>
        </Tooltip>
      )}

      <Tooltip content={connected ? "Connected" : "Connecting…"}>
        <span className="mr-1 flex items-center gap-1.5 px-1 text-[11px] text-fg-subtle" aria-live="polite">
          <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-success" : "bg-warning animate-pulse")} />
          <span className="hidden md:inline">{connected ? "Live" : "Connecting"}</span>
        </span>
      </Tooltip>

      <Tooltip content="Instructions for this chat">
        <button
          type="button"
          onClick={openInstructions}
          className={cn(iconButton, "hidden md:inline-flex", systemPrompt && "text-accent")}
          aria-label="Chat instructions"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </Tooltip>

      {hasChat && (
        <Tooltip content={shareToken ? "Shared — manage link" : "Share"}>
          <button
            type="button"
            onClick={() => void openShare()}
            className={cn(iconButton, "hidden md:inline-flex", shareToken && "text-accent")}
            aria-label="Share conversation"
          >
            <Link2 className="h-4 w-4" />
          </button>
        </Tooltip>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={cn(iconButton, !hasChat && "md:hidden")} aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="surface-pop min-w-[12rem] rounded-xl p-1">
          <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg text-fg focus:bg-surface-2 md:hidden" onClick={openInstructions}>
            <SlidersHorizontal className="h-4 w-4" /> Instructions
          </DropdownMenuItem>
          {hasChat && (
            <>
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg text-fg focus:bg-surface-2 md:hidden" onClick={() => void openShare()}>
                <Link2 className="h-4 w-4" /> {shareToken ? "Manage share link" : "Share"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-line md:hidden" />
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg text-fg focus:bg-surface-2" onClick={() => void onUpdate({ pinned: !pinned })}>
                {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {pinned ? "Unpin" : "Pin to top"}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg text-fg focus:bg-surface-2" onClick={openRename}>
                <Pencil className="h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-line" />
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg text-fg focus:bg-surface-2" onClick={() => void exportChat("markdown")}>
                <Download className="h-4 w-4" /> Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg text-fg focus:bg-surface-2" onClick={() => void exportChat("json")}>
                <Download className="h-4 w-4" /> Export as JSON
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />

      <Dialog open={renameOpen} onOpenChange={(open) => !busy && setRenameOpen(open)}>
        <DialogContent title="Rename conversation" size="sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveTitle();
            }}
          >
            <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={120} autoFocus aria-label="Conversation title" />
            <DialogFooter>
              <button type="button" onClick={() => setRenameOpen(false)} className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-fg hover:bg-surface-2">
                Cancel
              </button>
              <button type="submit" disabled={busy || !draftTitle.trim()} className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-strong disabled:opacity-50">
                Save
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={instructionsOpen} onOpenChange={(open) => !busy && setInstructionsOpen(open)}>
        <DialogContent title="Instructions for this chat" description="Tell the model how to behave in this conversation. Saved with the chat and sent with every message.">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PERSONAS.map((persona) => (
              <button
                key={persona.label}
                type="button"
                onClick={() => setDraftPrompt(persona.prompt)}
                className="rounded-full border border-line px-3 py-1 text-xs font-medium text-fg-muted hover:border-accent hover:text-accent"
              >
                {persona.label}
              </button>
            ))}
          </div>
          <Textarea value={draftPrompt} onChange={(event) => setDraftPrompt(event.target.value)} maxLength={4000} rows={6} placeholder="e.g. Answer in Spanish. Keep replies under 150 words." />
          <p className="mt-1 text-right font-mono text-[11px] text-fg-subtle">{draftPrompt.length} / 4000</p>
          {!hasChat && <p className="mt-2 text-xs text-fg-muted">Send your first message to create the chat, then set its instructions.</p>}
          <DialogFooter>
            <button type="button" onClick={() => setInstructionsOpen(false)} className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-fg hover:bg-surface-2">
              Cancel
            </button>
            <button type="button" disabled={busy || !hasChat} onClick={() => void saveInstructions()} className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-strong disabled:opacity-50">
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent title="Share conversation" description="Anyone with the link can read this conversation. Messages you add later are included too." size="sm">
          {share ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/60 p-2 pl-3">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg">{share.url}</span>
                <button type="button" onClick={() => void copyShare()} className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-strong">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button type="button" disabled={busy} onClick={() => void revokeShare()} className="flex items-center gap-1.5 text-xs font-medium text-danger hover:underline disabled:opacity-50">
                <Link2Off className="h-3.5 w-3.5" /> Disable this link
              </button>
            </div>
          ) : (
            <p className="text-sm text-fg-muted">Creating your link…</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
