import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Columns2, CornerDownLeft, MessageSquareText, Moon, Plus, Search, Sparkles, Sun } from "lucide-react";

import { useChatReset } from "../../context/chat-reset-context";
import { useChats } from "../../hooks/useChats";
import { useModelCatalogue } from "../../hooks/useModelCatalogue";
import { cn } from "../../lib/utils";
import { ProviderMark } from "../brand/ProviderMark";
import { useTheme } from "../theme-context";
import { Dialog, DialogContent } from "../ui/overlays";
import { Kbd } from "../ui/primitives";
import { ACCOUNT_NAV, ADMIN_NAV, PRIMARY_NAV } from "./nav";

/** Fired when a model is chosen from the palette; the chat page listens. */
export const SELECT_MODEL_EVENT = "polymind:select-model";

type Item = {
  id: string;
  group: "Actions" | "Pages" | "Recent chats" | "Models";
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
};

export default function CommandPalette({
  open,
  onOpenChange,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const { triggerReset } = useChatReset();
  const { chats } = useChats();
  const { models } = useModelCatalogue();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setQuery("");
      setCursor(0);
    }
    onOpenChange(next);
  };

  const items = useMemo<Item[]>(() => {
    const close = () => onOpenChange(false);
    const actions: Item[] = [
      {
        id: "new-chat",
        group: "Actions",
        label: "New chat",
        hint: "Start a fresh conversation",
        icon: <Plus className="h-4 w-4" />,
        run: () => {
          triggerReset();
          navigate("/dashboard");
          close();
        },
      },
      {
        id: "compare",
        group: "Actions",
        label: "Compare models side by side",
        hint: "Open a new arena chat",
        icon: <Columns2 className="h-4 w-4" />,
        run: () => {
          triggerReset();
          navigate("/dashboard?arena=1");
          close();
        },
      },
      {
        id: "theme",
        group: "Actions",
        label: resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        icon: resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        run: () => {
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          close();
        },
      },
    ];
    const pages: Item[] = [...PRIMARY_NAV, ...ACCOUNT_NAV, ...(isAdmin ? ADMIN_NAV : [])].map((item) => ({
      id: `page-${item.path}`,
      group: "Pages",
      label: item.label,
      hint: item.path,
      icon: <item.icon className="h-4 w-4" />,
      run: () => {
        if (item.path === "/dashboard") triggerReset();
        navigate(item.path);
        close();
      },
    }));
    const recent: Item[] = chats.slice(0, 12).map((chat) => ({
      id: `chat-${chat.id}`,
      group: "Recent chats",
      label: chat.title || "Untitled",
      hint: chat.mode === "arena" ? "Arena" : undefined,
      icon: <MessageSquareText className="h-4 w-4" />,
      run: () => {
        navigate(`/dashboard/chat/${chat.id}`);
        close();
      },
    }));
    const modelItems: Item[] = [
      {
        id: "model-auto",
        group: "Models",
        label: "Auto — smart routing",
        hint: "Let Polymind pick the model",
        icon: <Sparkles className="h-4 w-4 text-accent" />,
        run: () => {
          window.dispatchEvent(new CustomEvent(SELECT_MODEL_EVENT, { detail: "auto" }));
          close();
        },
      },
      ...models.map((model) => ({
        id: `model-${model.id}`,
        group: "Models" as const,
        label: model.display_name,
        hint: model.description,
        icon: <ProviderMark provider={model.provider} size="sm" />,
        run: () => {
          window.dispatchEvent(new CustomEvent(SELECT_MODEL_EVENT, { detail: model.id }));
          close();
        },
      })),
    ];
    return [...actions, ...pages, ...recent, ...modelItems];
  }, [chats, models, resolvedTheme, isAdmin, navigate, onOpenChange, setTheme, triggerReset]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.filter((item) => item.group !== "Models" || item.id === "model-auto");
    return items.filter((item) => `${item.label} ${item.hint ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  // The list shrinks while typing, so the cursor is clamped rather than reset.
  const cursorIndex = Math.min(cursor, Math.max(filtered.length - 1, 0));

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursorIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [cursorIndex]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      filtered[cursorIndex]?.run();
    }
  };

  let lastGroup: string | null = null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent title="Command palette" hideClose className="p-0 sm:max-w-xl [&>div:first-child]:sr-only [&>div:last-child]:p-0">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search pages, chats, models…"
            className="h-12 w-full bg-transparent text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none"
            aria-label="Search commands"
          />
          <Kbd>esc</Kbd>
        </div>
        <div ref={listRef} className="custom-scrollbar max-h-[60vh] overflow-y-auto p-1.5">
          {filtered.length === 0 && <p className="px-3 py-8 text-center text-sm text-fg-muted">No matches.</p>}
          {filtered.map((item, index) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {showGroup && (
                  <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">{item.group}</p>
                )}
                <button
                  type="button"
                  data-index={index}
                  onMouseEnter={() => setCursor(index)}
                  onClick={item.run}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm",
                    index === cursorIndex ? "bg-accent-soft text-fg" : "text-fg-muted",
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg-muted">{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-fg">{item.label}</span>
                    {item.hint && <span className="block truncate text-xs text-fg-subtle">{item.hint}</span>}
                  </span>
                  {index === cursorIndex && <CornerDownLeft className="h-3.5 w-3.5 text-fg-subtle" />}
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
