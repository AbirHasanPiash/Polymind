import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { CodeBlock } from "./CodeBlock";

import "katex/dist/katex.min.css";

/**
 * Defined once at module scope.
 *
 * An object literal passed inline would be a new value on every render, which
 * makes react-markdown rebuild its whole component map for each streamed token.
 */
const components: Partial<Components> = {
  p: ({ children }) => (
    <p className="mb-4 text-sm leading-[1.75] text-slate-700 last:mb-0 sm:text-[15px] dark:text-gray-100">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 ml-5 list-outside list-disc space-y-2 text-sm text-slate-700 sm:ml-6 sm:text-[15px] dark:text-gray-100">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-5 list-outside list-decimal space-y-2 text-sm text-slate-700 sm:ml-6 sm:text-[15px] dark:text-gray-100">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-[1.75]">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mt-6 mb-4 border-b border-slate-200 pb-2 text-2xl font-bold text-slate-900 sm:text-3xl dark:border-gray-700/50 dark:text-white">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 mb-3 text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 text-lg font-semibold text-slate-800 sm:text-xl dark:text-gray-100">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-2 text-base font-semibold text-slate-700 sm:text-lg dark:text-gray-200">
      {children}
    </h4>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r-lg border-l-4 border-blue-500/80 bg-blue-50 py-2 pr-3 pl-4 text-sm italic text-slate-600 sm:py-3 sm:pl-5 sm:text-base dark:bg-blue-500/5 dark:text-gray-200">
      {children}
    </blockquote>
  ),
  // Tables scroll inside their own box so a wide table cannot widen the page.
  table: ({ children }) => (
    <div className="custom-scrollbar my-4 overflow-x-auto rounded-lg border border-slate-200 sm:my-6 dark:border-gray-700/50">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700/50">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100 dark:bg-gray-800/50">{children}</thead>,
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-200 bg-white/50 dark:divide-gray-700/30 dark:bg-gray-900/20">
      {children}
    </tbody>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-800 sm:px-5 sm:py-3.5 sm:text-sm dark:text-gray-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-xs leading-relaxed text-slate-700 sm:px-5 sm:py-3.5 sm:text-sm dark:text-gray-300">
      {children}
    </td>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      // noreferrer as well as noopener: without it the target page can read
      // where the click came from, and older browsers still leak window.opener.
      rel="noopener noreferrer"
      className="text-blue-600 underline underline-offset-2 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-slate-700 dark:text-gray-200">{children}</em>,
  hr: () => <hr className="my-4 border-slate-200 sm:my-6 dark:border-gray-700/50" />,
  img: ({ src, alt }) => (
    <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" className="my-3 max-w-full rounded-lg" />
  ),
  code: CodeBlock,
};

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];

/** Renders assistant markdown. Memoised on `content`. */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
