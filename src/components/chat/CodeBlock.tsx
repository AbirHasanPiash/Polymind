import { memo, useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, ClipboardDocumentIcon } from "@heroicons/react/24/solid";
// PrismAsyncLight, not Prism: the default export bundles every language Prism
// supports (~600 kB) into the chat chunk. This variant ships the highlighter
// core only and fetches a language grammar the first time it is needed, so a
// conversation with no Rust in it never downloads the Rust grammar.
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-async-light";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const COLLAPSE_AFTER_LINES = 20;
const COPY_FEEDBACK_MS = 2000;

type CodeBlockProps = {
  className?: string;
  children?: React.ReactNode;
};

/**
 * Fenced code block with copy and expand controls.
 *
 * Memoised because highlighting is the single most expensive thing rendered in
 * a conversation: without it, every streamed token re-tokenises every code
 * block already on screen.
 */
function CodeBlockComponent({ className, children }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className ?? "");
  const code = String(children ?? "").replace(/\n$/, "");
  const lineCount = code.split("\n").length;
  const canCollapse = lineCount > COLLAPSE_AFTER_LINES;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setIsCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard access can be denied; the code is still selectable.
    }
  }, [code]);

  // Inline code: `react-markdown` v10 renders these without a language class.
  if (!match) {
    return (
      <code className="rounded-md border border-slate-300 bg-slate-200 px-1.5 py-0.5 font-mono text-[0.85em] text-blue-700 dark:border-gray-700/40 dark:bg-gray-800/60 dark:text-blue-300">
        {children}
      </code>
    );
  }

  const language = match[1];

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-gray-700/40 bg-[#1e1e1e] shadow-lg sm:my-6">
      <div className="flex items-center justify-between gap-2 border-b border-gray-700/40 bg-[#2d2d2d]/80 px-3 py-2 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="hidden gap-1.5 sm:flex">
            <span className="h-3 w-3 rounded-full bg-red-500/90" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/90" />
            <span className="h-3 w-3 rounded-full bg-green-500/90" />
          </div>
          <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-widest text-gray-400 sm:text-xs">
            {language}
          </span>
          <span className="hidden border-l border-gray-700 pl-2 font-mono text-[10px] text-gray-500 sm:inline sm:pl-3 sm:text-xs">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {canCollapse && (
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-700/40 hover:text-blue-400 sm:gap-1.5 sm:px-2.5 sm:text-xs"
            >
              <span className="hidden font-medium sm:inline">
                {isExpanded ? "Collapse" : "Expand"}
              </span>
              <ChevronDownIcon
                className={`h-3 w-3 transition-transform duration-200 sm:h-3.5 sm:w-3.5 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700/40 hover:text-emerald-400"
            aria-label="Copy code"
          >
            {isCopied ? (
              <CheckIcon className="h-3.5 w-3.5 text-emerald-400 sm:h-4 sm:w-4" />
            ) : (
              <ClipboardDocumentIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </button>
        </div>
      </div>

      <div
        className={`relative overflow-hidden ${
          canCollapse && !isExpanded ? "max-h-[400px] sm:max-h-[500px]" : ""
        }`}
      >
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "#1e1e1e",
            fontSize: "0.8rem",
            lineHeight: 1.6,
          }}
          showLineNumbers={lineCount > 5}
        >
          {code}
        </SyntaxHighlighter>

        {canCollapse && !isExpanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/80 to-transparent sm:h-24" />
        )}
      </div>
    </div>
  );
}

export const CodeBlock = memo(CodeBlockComponent);
