import { Component, ReactNode, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface MarkdownWithMathProps {
  children: string;
  className?: string;
  /**
   * Optional console label to distinguish callers in error logs.
   */
  sourceLabel?: string;
}

class MathErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; sourceLabel?: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    const label = this.props.sourceLabel ?? "MarkdownWithMath";
    console.warn(`[${label}] Math render failed, showing without LaTeX:`, error?.message);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function sanitizeMathDelimiters(text: string): string {
  return String(text)
    .replace(/\$\$\s*\$\$/g, " ")
    .replace(/\$\s*\$/g, " ");
}

function normalizeLatexBackslashes(text: string): string {
  return String(text).replace(/\\\\/g, "\\");
}

export function MarkdownWithMath({
  children,
  className = "",
  sourceLabel,
}: MarkdownWithMathProps) {
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
    <MathErrorBoundary fallback={fallback} sourceLabel={sourceLabel}>
      <div className={className}>
        <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
          {sanitized}
        </ReactMarkdown>
      </div>
    </MathErrorBoundary>
  );
}

