import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  DocumentIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PhotoIcon,
  StopIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

import { useToast } from "../context/toast-context";
import { MAX_FILE_SIZE_BYTES, UPLOAD_LIMITS } from "../lib/env";
import { formatBytes } from "../lib/format";
import { cn } from "../lib/utils";

const MAX_TEXTAREA_HEIGHT = 200;
const PLACEHOLDER_INTERVAL_MS = 5000;

const PLACEHOLDERS = [
  "What do you want to build today?",
  "Start typing — I'll handle the rest",
  "From idea to execution, faster than ever",
  "Write, debug, and explore — all in one place",
  "Think better. Build faster. Ship smarter.",
];

type ChatInputProps = {
  input: string;
  setInput: (value: string) => void;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  isStreaming: boolean;
  isThinking: boolean;
  onSend: () => void;
  onStop: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Cycle the hint text; only meaningful on an empty conversation. */
  rotatePlaceholder?: boolean;
};

/** Preview thumbnail. The object URL is created once per file and revoked on unmount. */
const FilePreview = memo(function FilePreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const previewUrl = useMemo(
    () => (file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!previewUrl) return;
    // Creating the URL inline during render leaked one blob per render and made
    // the thumbnail reload (and visibly flash) on every keystroke.
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="flex items-center gap-2.5 border-b border-blue-100 bg-slate-50 px-3 py-2 sm:px-4 dark:border-white/5 dark:bg-white/[0.03]">
      <div className="shrink-0">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="h-10 w-10 rounded-lg border border-slate-200 object-cover sm:h-11 sm:w-11 dark:border-white/10"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-blue-100 sm:h-11 sm:w-11 dark:border-white/10 dark:bg-blue-500/10">
            <DocumentIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-700 sm:text-sm dark:text-gray-200">
          {file.name}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-slate-500 sm:text-xs dark:text-gray-500">
          {formatBytes(file.size)}
        </p>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-rose-500 active:scale-95 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-rose-400"
        aria-label={`Remove ${file.name}`}
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
});

function ChatInputComponent({
  input,
  setInput,
  selectedFiles,
  setSelectedFiles,
  isStreaming,
  isThinking,
  onSend,
  onStop,
  textareaRef,
  rotatePlaceholder = false,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // The rotation lives here rather than in the page: as page state it re-rendered
  // the entire transcript — markdown, code highlighting and all — every 5 seconds.
  useEffect(() => {
    if (!rotatePlaceholder) return;
    const timer = setInterval(
      () => setPlaceholderIndex((index) => (index + 1) % PLACEHOLDERS.length),
      PLACEHOLDER_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [rotatePlaceholder]);

  // Autosize before paint, so the box never renders at the wrong height first.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const height = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
    textarea.style.height = `${height}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [input, textareaRef]);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const room = UPLOAD_LIMITS.maxFiles - selectedFiles.length;
      if (room <= 0) {
        toast.error(`You can attach up to ${UPLOAD_LIMITS.maxFiles} files per message`);
        return;
      }

      // Mirrors the backend's limits so the user is told immediately instead of
      // after a failed upload.
      const tooLarge = incoming.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
      if (tooLarge.length > 0) {
        toast.error(
          `${tooLarge[0].name} is larger than ${UPLOAD_LIMITS.maxFileSizeMb} MB and was skipped`,
        );
      }

      const accepted = incoming.filter((file) => file.size <= MAX_FILE_SIZE_BYTES).slice(0, room);
      if (accepted.length < incoming.length - tooLarge.length) {
        toast.error(`Only ${UPLOAD_LIMITS.maxFiles} files can be attached at once`);
      }
      if (accepted.length > 0) setSelectedFiles([...selectedFiles, ...accepted]);
    },
    [selectedFiles, setSelectedFiles, toast],
  );

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) addFiles(Array.from(event.target.files));
      // Reset so selecting the same file twice still fires a change event.
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addFiles],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter sends, Shift+Enter adds a newline. IME composition must not send.
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        onSend();
      }
    },
    [onSend],
  );

  const removeFile = useCallback(
    (index: number) => setSelectedFiles(selectedFiles.filter((_, i) => i !== index)),
    [selectedFiles, setSelectedFiles],
  );

  const isBusy = isStreaming || isThinking;
  const canSend = (input.trim().length > 0 || selectedFiles.length > 0) && !isBusy;
  const showPlaceholder = !input && !isBusy && selectedFiles.length === 0;

  return (
    <div className="relative shrink-0 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] app-surface sm:px-4 sm:py-4 md:px-6 dark:bg-gradient-to-b dark:from-[#0a0b0f] dark:via-[#0d0e14] dark:to-[#0a0b0f]">
      <div className="relative mx-auto max-w-3xl">
        <div className="group relative">
          {/* Focus glow */}
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-blue-200/50 opacity-0 blur-sm transition-opacity duration-300 group-focus-within:opacity-100 dark:bg-gradient-to-r dark:from-blue-500/20 dark:via-purple-500/20 dark:to-blue-500/20" />

          {/* Focus is shown on the container, not on the textarea. A ring on the
              textarea itself would be clipped by this box's overflow-hidden and
              appear as a stray line along one edge. */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm transition-colors duration-200 group-focus-within:border-blue-400 dark:border-white/[0.08] dark:bg-gradient-to-br dark:from-[#1a1d26] dark:to-[#151820] dark:shadow-2xl dark:group-focus-within:border-blue-500/40">
            {selectedFiles.length > 0 && (
              <div className="custom-scrollbar max-h-[200px] overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100 bg-slate-50/90 px-3 py-2 backdrop-blur-sm sm:px-4 dark:border-white/10 dark:bg-[#1a1d26]/90">
                  <div className="flex items-center gap-2">
                    <PhotoIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    <span className="text-xs font-medium text-slate-700 sm:text-sm dark:text-gray-300">
                      {selectedFiles.length} of {UPLOAD_LIMITS.maxFiles} attached
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="rounded px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-500/10 dark:text-rose-400"
                  >
                    Clear all
                  </button>
                </div>

                {selectedFiles.map((file, index) => (
                  <FilePreview
                    key={`${file.name}-${file.lastModified}-${index}`}
                    file={file}
                    onRemove={() => removeFile(index)}
                  />
                ))}
              </div>
            )}

            <div className="relative">
              <label htmlFor="chat-composer" className="sr-only">
                Message
              </label>
              <textarea
                id="chat-composer"
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                rows={1}
                // 16px on mobile: anything smaller makes iOS Safari zoom in on focus.
                className="w-full resize-none border-none bg-transparent py-3 pr-11 pl-10 text-base leading-relaxed text-slate-800 outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:py-3.5 sm:pr-12 sm:pl-11 sm:text-[15px] dark:text-white"
                style={{ maxHeight: MAX_TEXTAREA_HEIGHT, overflowY: "hidden" }}
                aria-label="Message"
              />

              {showPlaceholder && (
                <div className="pointer-events-none absolute top-3 right-12 left-10 truncate text-base text-slate-400 sm:top-3.5 sm:right-14 sm:left-11 sm:text-[15px] dark:text-gray-500">
                  <span key={placeholderIndex} className="inline-block animate-fade-in">
                    {rotatePlaceholder ? PLACEHOLDERS[placeholderIndex] : "Send a message…"}
                  </span>
                </div>
              )}

              {isStreaming && !input && (
                <div className="pointer-events-none absolute top-3 right-12 left-10 flex items-center gap-2 text-base text-slate-500 sm:top-3.5 sm:right-14 sm:left-11 sm:text-[15px] dark:text-gray-600">
                  <span className="animate-pulse">⏳</span>
                  <span>Waiting for response…</span>
                </div>
              )}

              <div className="absolute bottom-2 left-2 z-10 sm:bottom-3 sm:left-2.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className={cn(
                    "rounded-lg p-1.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
                    selectedFiles.length > 0
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                      : "text-slate-400 hover:bg-blue-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-400",
                  )}
                  aria-label="Attach files"
                >
                  <PaperClipIcon className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
                </button>
              </div>

              <div className="absolute right-2 bottom-2 z-10 sm:right-2.5 sm:bottom-2.5">
                {isBusy ? (
                  <button
                    type="button"
                    onClick={onStop}
                    className="rounded-lg border border-rose-200 bg-rose-100 p-2 text-rose-500 hover:bg-rose-200 active:scale-95 sm:p-2.5 dark:border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400"
                    aria-label="Stop generating"
                  >
                    <StopIcon className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={!canSend}
                    className="rounded-lg border border-white/10 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-2 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-purple-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none sm:p-2.5 dark:from-blue-500 dark:via-blue-600 dark:to-purple-600"
                    aria-label="Send message"
                  >
                    <PaperAirplaneIcon className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-2.5 text-center text-[10px] font-medium tracking-wide text-slate-400 sm:text-[11px] dark:text-gray-500/80">
          <span className="text-amber-500/80">⚠</span> AI can make mistakes — verify important
          information
        </p>
      </div>
    </div>
  );
}

export default memo(ChatInputComponent);
