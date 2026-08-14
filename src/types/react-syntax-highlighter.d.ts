/**
 * `@types/react-syntax-highlighter` only declares the package root, not its
 * deep entry points. These declarations cover the two we import directly: the
 * async-light highlighter and the Prism theme collection.
 */

declare module "react-syntax-highlighter/dist/esm/prism-async-light" {
  import type { ComponentType, CSSProperties, ReactNode } from "react";

  export interface SyntaxHighlighterProps {
    language?: string;
    style?: Record<string, CSSProperties>;
    customStyle?: CSSProperties;
    codeTagProps?: Record<string, unknown>;
    PreTag?: string | ComponentType<Record<string, unknown>>;
    CodeTag?: string | ComponentType<Record<string, unknown>>;
    showLineNumbers?: boolean;
    startingLineNumber?: number;
    wrapLines?: boolean;
    wrapLongLines?: boolean;
    lineNumberStyle?: CSSProperties;
    children?: ReactNode;
  }

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps> & {
    registerLanguage: (name: string, definition: unknown) => void;
  };

  export default SyntaxHighlighter;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  import type { CSSProperties } from "react";

  export const vscDarkPlus: Record<string, CSSProperties>;
  export const oneDark: Record<string, CSSProperties>;
  export const oneLight: Record<string, CSSProperties>;
}
