import { MarkdownWithMath } from "./MarkdownWithMath";

interface RichTextContentProps {
  children: string;
  className?: string;
}

/**
 * Shared LaTeX-capable text renderer for prompts and choices.
 * Delegates to MarkdownWithMath so the markdown/maths pipeline is shared.
 */
export function RichTextContent({ children, className = "" }: RichTextContentProps) {
  return (
    <MarkdownWithMath className={className} sourceLabel="RichTextContent">
      {children}
    </MarkdownWithMath>
  );
}
