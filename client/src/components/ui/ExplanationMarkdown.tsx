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

export function ExplanationMarkdown({ children, className = defaultClassName }: ExplanationMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
