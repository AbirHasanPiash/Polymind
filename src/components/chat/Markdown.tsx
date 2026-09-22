import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { CodeBlock } from "./CodeBlock";

import "katex/dist/katex.min.css";

/**
 * Defined once at module scope: an object literal passed inline would be a new
 * value on every render, which makes react-markdown rebuild its whole
 * component map for each streamed token.
 */
const components: Partial<Components> = {
  p: ({ children }) => <p className="mb-3 text-[15px] leading-[1.7] text-fg last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 ml-5 list-outside list-disc space-y-1.5 text-[15px] text-fg">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-5 list-outside list-decimal space-y-1.5 text-[15px] text-fg">{children}</ol>,
  li: ({ children }) => <li className="pl-1 leading-[1.7]">{children}</li>,
  h1: ({ children }) => <h1 className="mt-5 mb-3 border-b border-line pb-2 text-2xl font-semibold tracking-tight text-fg">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-5 mb-2.5 text-xl font-semibold tracking-tight text-fg">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-4 mb-2 text-lg font-semibold text-fg">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-3 mb-2 text-base font-semibold text-fg">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 rounded-r-lg border-l-4 border-accent/60 bg-accent-soft py-2 pr-3 pl-4 text-[15px] text-fg-muted">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="custom-scrollbar my-4 overflow-x-auto rounded-xl border border-line">
      <table className="min-w-full divide-y divide-line text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-2">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-line">{children}</tbody>,
  th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold tracking-wider text-fg-muted uppercase sm:px-4">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 align-top text-sm leading-relaxed text-fg sm:px-4">{children}</td>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-strong">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-5 border-line" />,
  img: ({ src, alt }) => (
    <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" className="my-3 max-w-full rounded-xl border border-line" />
  ),
  code: CodeBlock,
};

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];

/** Renders assistant markdown. Memoised on `content`. */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="prose max-w-none">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
