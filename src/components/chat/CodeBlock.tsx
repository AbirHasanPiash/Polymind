import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
// PrismAsyncLight, not Prism: the default export bundles every language Prism
// supports (~600 kB) into the chat chunk. This variant ships the highlighter
// core only and fetches a language grammar the first time it is needed.
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-async-light";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

import { useTheme } from "../theme-context";

const COLLAPSE_AFTER_LINES = 24;
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
  const { resolvedTheme } = useTheme();
  const match = /language-(\w+)/.exec(className ?? "");
  const code = String(children ?? "").replace(/\n$/, "");
  const lineCount = code.split("\n").length;
  const canCollapse = lineCount > COLLAPSE_AFTER_LINES;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

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
      <code className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-accent">
        {children}
      </code>
    );
  }

  const language = match[1];
  const dark = resolvedTheme === "dark";

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-line bg-surface-2/60 sm:my-5">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-[11px] font-semibold tracking-wider text-fg-muted uppercase">{language}</span>
          <span className="hidden border-l border-line pl-2 font-mono text-[11px] text-fg-subtle sm:inline">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canCollapse && (
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-fg-muted hover:bg-surface-3 hover:text-fg"
            >
              {isExpanded ? "Collapse" : "Expand"}
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-fg-muted hover:bg-surface-3 hover:text-fg"
            aria-label="Copy code"
          >
            {isCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isCopied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      <div className={`relative overflow-hidden ${canCollapse && !isExpanded ? "max-h-[420px]" : ""}`}>
        <SyntaxHighlighter
          style={dark ? oneDark : oneLight}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            fontSize: "0.8125rem",
            lineHeight: 1.65,
          }}
          codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
          showLineNumbers={lineCount > 5}
          lineNumberStyle={{ opacity: 0.4, minWidth: "2.2em" }}
        >
          {code}
        </SyntaxHighlighter>

        {canCollapse && !isExpanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface-2 to-transparent" />
        )}
      </div>
    </div>
  );
}

export const CodeBlock = memo(CodeBlockComponent);
