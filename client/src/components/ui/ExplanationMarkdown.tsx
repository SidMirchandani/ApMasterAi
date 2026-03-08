import { Component, ReactNode, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const defaultClassName =
  "text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none";

interface ExplanationMarkdownProps {
  children: string;
  className?: string;
}

/**
 * Error boundary so a single malformed formula does not crash the whole page.
 * Renders markdown without math as fallback.
 */
class MathErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[ExplanationMarkdown] Math render failed, showing without LaTeX:", error?.message);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/** Remove empty math delimiters $ $ and $$ $$ to avoid parser crashes. */
function sanitizeMathDelimiters(text: string): string {
  return String(text)
    .replace(/\$\$\s*\$\$/g, " ")
    .replace(/\$\s*\$/g, " ");
}

/**
 * Normalize backslashes so KaTeX sees single backslashes.
 * DB/JSON often stores \\frac; we need \frac for KaTeX.
 */
function normalizeLatexBackslashes(text: string): string {
  return String(text).replace(/\\\\/g, "\\");
}

/**
 * Reusable markdown + LaTeX renderer for explanations.
 * Uses react-markdown with remark-gfm, remark-math (v6+), and rehype-katex (v7+).
 * Math runs only after mount to avoid SSR/hydration issues.
 */
export function ExplanationMarkdown({ children, className = defaultClassName }: ExplanationMarkdownProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const raw = typeof children === "string" ? children : "";
  const sanitized = normalizeLatexBackslashes(sanitizeMathDelimiters(raw));

  const fallback = (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{sanitized}</ReactMarkdown>
    </div>
  );

  const remarkPlugins = mounted ? [remarkGfm, remarkMath] : [remarkGfm];
  const rehypePlugins = mounted ? [rehypeKatex] : [];

  return (
    <MathErrorBoundary fallback={fallback}>
      <div className={className}>
        <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
          {sanitized}
        </ReactMarkdown>
      </div>
    </MathErrorBoundary>
  );
}
