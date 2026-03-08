import { Component, ReactNode, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const defaultClassName =
  "text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none";

interface ExplanationMarkdownProps {
  children: string;
  className?: string;
}

/** Catches math-render errors (e.g. malformed LaTeX) and shows fallback without math. */
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

/**
 * Renders markdown with GFM and LaTeX (KaTeX). Math plugins are only used after
 * mount to avoid SSR/client exceptions. If the math pipeline throws (e.g. malformed
 * LaTeX causing "Cannot set properties of undefined"), we fall back to markdown-only.
 */
export function ExplanationMarkdown({ children, className = defaultClassName }: ExplanationMarkdownProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fallback = (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );

  return (
    <MathErrorBoundary fallback={fallback}>
      <div className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, ...(mounted ? [remarkMath] : [])]}
          rehypePlugins={mounted ? [rehypeKatex] : []}
        >
          {children}
        </ReactMarkdown>
      </div>
    </MathErrorBoundary>
  );
}
