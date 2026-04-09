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

/**
 * Repair common mojibake/encoding artifacts seen in imported question text.
 * Example: "ion▯b4dipole" -> "ion-dipole", "pi▯b4pi" -> "pi-pi".
 */
function repairTextEncodingArtifacts(text: string): string {
  return String(text)
    // Typical UTF-8 mojibake for en/em dashes.
    .replace(/â€“|â€”/g, "-")
    // Placeholder glyph + b4 artifact between word characters.
    .replace(/([\p{L}\p{N}])(?:[\uFFFD\u25A1\u25AF\u2060\u200B\uFEFF])?b4(?=[\p{L}\p{N}])/gu, "$1-")
    // Spaced variant: "pi b4 pi" -> "pi-pi".
    .replace(/([\p{L}\p{N}])\s+b4\s+(?=[\p{L}\p{N}])/gu, "$1-")
    // Common glycosidic notation mojibake: "�b2(\1to4)" -> "β(1→4)".
    .replace(
      /(?:[\uFFFD\u25A1\u25AF\u2060\u200B\uFEFF\u21B5\u23CE])?b2\s*\(\s*\\?1to4\s*\)/giu,
      "β(1→4)"
    )
    // Generic arrow fix for escaped text like "\1to6" -> "1→6".
    .replace(/\\?1to([2-9])/g, "1→$1");
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
  const sanitized = repairTextEncodingArtifacts(
    normalizeLatexBackslashes(sanitizeMathDelimiters(raw))
  );

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

