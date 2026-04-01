import { MarkdownWithMath } from "./MarkdownWithMath";

const defaultClassName =
  "text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none";

interface ExplanationMarkdownProps {
  children: string;
  className?: string;
}

/**
 * Reusable markdown + LaTeX renderer for explanations.
 * Delegates to MarkdownWithMath to share the markdown/maths pipeline with RichTextContent.
 */
export function ExplanationMarkdown({ children, className = defaultClassName }: ExplanationMarkdownProps) {
  return (
    <MarkdownWithMath className={className} sourceLabel="ExplanationMarkdown">
      {children}
    </MarkdownWithMath>
  );
}
