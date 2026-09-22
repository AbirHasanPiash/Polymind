import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { ArrowUp, BookmarkPlus, FileText, Mic, MicOff, Paperclip, Square, X } from "lucide-react";

import type { Effort, SavedPrompt } from "../../api/types";
import { useToast } from "../../context/toast-context";
import { useSpeechInput } from "../../hooks/useSpeechInput";
import { MAX_FILE_SIZE_BYTES, UPLOAD_LIMITS } from "../../lib/env";
import { formatBytes } from "../../lib/format";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger, Tooltip } from "../ui/overlays";
import { EffortPicker } from "./EffortPicker";
import { ModelPicker } from "./ModelPicker";
import type { ModelSelection } from "./types";

const MAX_TEXTAREA_HEIGHT = 220;

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  selection: ModelSelection;
  onSelectionChange: (selection: ModelSelection) => void;
  effort: Effort;
  onEffortChange: (effort: Effort) => void;
  effortLevels: Effort[];
  busy: boolean;
  connected: boolean;
  onSend: () => void;
  onStop: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  savedPrompts: SavedPrompt[];
  sendOnEnter: boolean;
  /** Arena chats keep their model set; the picker is locked to arena mode. */
  lockMode?: "chat" | "arena" | null;
  placeholder?: string;
};

/** Preview chip for an attached file. The object URL is revoked on unmount. */
const FileChip = memo(function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const previewUrl = useMemo(() => (file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/70 py-1.5 pr-1.5 pl-2">
      {previewUrl ? (
        <img src={previewUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-soft text-accent">
          <FileText className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block max-w-[10rem] truncate text-xs font-medium text-fg">{file.name}</span>
        <span className="block font-mono text-[10px] text-fg-subtle">{formatBytes(file.size)}</span>
      </span>
      <button type="button" onClick={onRemove} className="rounded-md p-1 text-fg-subtle hover:bg-surface-3 hover:text-danger" aria-label={`Remove ${file.name}`}>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
});

function ComposerComponent({
  value,
  onChange,
  files,
  onFilesChange,
  selection,
  onSelectionChange,
  effort,
  onEffortChange,
  effortLevels,
  busy,
  connected,
  onSend,
  onStop,
  textareaRef,
  savedPrompts,
  sendOnEnter,
  lockMode = null,
  placeholder = "Message Polymind…",
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [dragging, setDragging] = useState(false);
  const interimRef = useRef("");

  const speech = useSpeechInput(
    useCallback(
      (text: string, isFinal: boolean) => {
        const base = textareaRef.current?.value ?? "";
        const withoutInterim = interimRef.current ? base.slice(0, base.length - interimRef.current.length) : base;
        if (isFinal) {
          interimRef.current = "";
          onChange(`${withoutInterim}${withoutInterim && !withoutInterim.endsWith(" ") ? " " : ""}${text.trim()} `);
        } else {
          interimRef.current = text;
          onChange(`${withoutInterim}${text}`);
        }
      },
      [onChange, textareaRef],
    ),
  );

  // Autosize before paint, so the box never renders at the wrong height first.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const height = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
    textarea.style.height = `${height}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [value, textareaRef]);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const room = UPLOAD_LIMITS.maxFiles - files.length;
      if (room <= 0) {
        toast.error(`You can attach up to ${UPLOAD_LIMITS.maxFiles} files per message`);
        return;
      }
      const tooLarge = incoming.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
      if (tooLarge.length > 0) {
        toast.error(`${tooLarge[0].name} is larger than ${UPLOAD_LIMITS.maxFileSizeMb} MB and was skipped`);
      }
      const accepted = incoming.filter((file) => file.size <= MAX_FILE_SIZE_BYTES).slice(0, room);
      if (accepted.length < incoming.length - tooLarge.length) {
        toast.error(`Only ${UPLOAD_LIMITS.maxFiles} files can be attached at once`);
      }
      if (accepted.length > 0) onFilesChange([...files, ...accepted]);
    },
    [files, onFilesChange, toast],
  );

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) addFiles(Array.from(event.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addFiles],
  );

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      if (event.dataTransfer.files.length) addFiles(Array.from(event.dataTransfer.files));
    },
    [addFiles],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const pasted = Array.from(event.clipboardData.files ?? []);
      if (pasted.length > 0) {
        event.preventDefault();
        addFiles(pasted);
      }
    },
    [addFiles],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) return;
      const submit = sendOnEnter ? event.key === "Enter" && !event.shiftKey : event.key === "Enter" && (event.metaKey || event.ctrlKey);
      if (submit) {
        event.preventDefault();
        onSend();
      }
    },
    [onSend, sendOnEnter],
  );

  const canSend = (value.trim().length > 0 || files.length > 0) && !busy && connected;
  const arenaIncomplete = selection.mode === "arena" && selection.models.length < 2;

  return (
    <div className="shrink-0 px-3 pb-3 sm:px-4 sm:pb-4 safe-bottom">
      <div className="relative mx-auto max-w-3xl">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "group relative rounded-2xl border bg-surface shadow-card transition-colors focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15",
            dragging ? "border-accent ring-2 ring-accent/20" : "border-line",
          )}
        >
          {dragging && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-accent-soft text-sm font-medium text-accent">
              Drop files to attach
            </div>
          )}

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {files.map((file, index) => (
                <FileChip key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => onFilesChange(files.filter((_, i) => i !== index))} />
              ))}
            </div>
          )}

          <label htmlFor="chat-composer" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-composer"
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
            placeholder={busy ? "Generating…" : placeholder}
            // 16px on mobile: anything smaller makes iOS Safari zoom in on focus.
            className="custom-scrollbar w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-base leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none sm:text-[15px]"
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT, overflowY: "hidden" }}
          />

          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple aria-hidden="true" tabIndex={-1} />
              <Tooltip content="Attach files (images, PDF, code, docs)">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50",
                    files.length > 0 && "bg-accent-soft text-accent",
                  )}
                  aria-label="Attach files"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </Tooltip>

              <ModelPicker selection={selection} onChange={onSelectionChange} disabled={busy} allowArena={lockMode !== "chat"} />
              <EffortPicker value={effort} onChange={onEffortChange} levels={effortLevels} disabled={busy} />

              {savedPrompts.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label="Saved prompts">
                      <BookmarkPlus className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" className="w-72 p-1.5">
                    <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Saved prompts</p>
                    <div className="custom-scrollbar max-h-64 overflow-y-auto">
                      {savedPrompts.map((prompt) => (
                        <button
                          key={prompt.id}
                          type="button"
                          onClick={() => {
                            onChange(value ? `${value}\n${prompt.content}` : prompt.content);
                            textareaRef.current?.focus();
                          }}
                          className="flex w-full flex-col rounded-lg px-2.5 py-2 text-left hover:bg-surface-2"
                        >
                          <span className="text-sm font-medium text-fg">{prompt.title}</span>
                          <span className="line-clamp-2 text-xs text-fg-muted">{prompt.content}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {speech.supported && (
                <Tooltip content={speech.listening ? "Stop dictation" : "Dictate"}>
                  <button
                    type="button"
                    onClick={speech.toggle}
                    disabled={busy}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50",
                      speech.listening && "bg-danger/10 text-danger animate-pulse",
                    )}
                    aria-label={speech.listening ? "Stop dictation" : "Dictate"}
                  >
                    {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                </Tooltip>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!connected && !busy && <span className="hidden text-[11px] text-fg-subtle sm:inline">Connecting…</span>}
              {busy ? (
                <Tooltip content="Stop generating">
                  <button
                    type="button"
                    onClick={onStop}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-fg text-canvas hover:opacity-90"
                    aria-label="Stop generating"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </button>
                </Tooltip>
              ) : (
                <Tooltip content={arenaIncomplete ? "Pick at least two models" : sendOnEnter ? "Send (Enter)" : "Send (⌘/Ctrl + Enter)"}>
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={!canSend || arenaIncomplete}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-sm hover:bg-accent-strong disabled:opacity-40 disabled:shadow-none"
                    aria-label="Send message"
                  >
                    <ArrowUp className="h-4.5 w-4.5" strokeWidth={2.5} />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-fg-subtle">
          Models can make mistakes. Check important information.
        </p>
      </div>
    </div>
  );
}

export const Composer = memo(ComposerComponent);
