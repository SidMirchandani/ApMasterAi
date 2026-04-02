import React from 'react';
import { RichTextContent } from '@/components/ui/RichTextContent';

type Block =
  | { type: "text"; value: string }
  | { type: "image"; url: string };

interface BlockRendererProps {
  blocks: Block[];
  className?: string;
}

function getImageUrl(url: string): string {
  return url;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ blocks, className = "" }) => {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "text") {
          const text = block.value || (block as any).content || "";
          if (!text) return null;
          return (
            <RichTextContent
              key={index}
              className="
                text-gray-900 dark:text-white leading-relaxed prose prose-sm dark:prose-invert max-w-none
                /* VS Code-like editor styling for code blocks */
                prose-pre:font-mono prose-pre:text-xs sm:prose-pre:text-sm prose-pre:leading-relaxed
                prose-pre:bg-[#f3f3f3] prose-pre:text-[#333333] prose-pre:border prose-pre:border-[#d4d4d4]
                prose-pre:rounded-[6px] prose-pre:px-4 prose-pre:py-3 prose-pre:shadow-sm
                dark:prose-pre:bg-[#1e1e1e] dark:prose-pre:text-[#d4d4d4] dark:prose-pre:border-[#3c3c3c]
                prose-code:bg-transparent prose-code:text-inherit
              "
            >
              {text}
            </RichTextContent>
          );
        } else if (block.type === "image") {
          const imgSrc = getImageUrl(block.url);
          return (
            <div
              key={index}
              className="relative inline-flex items-start justify-start max-w-[260px] max-h-[200px] overflow-visible rounded-md align-top shrink-0 group"
            >
              <img
                src={imgSrc}
                alt={`Content image ${index + 1}`}
                className="object-contain w-full h-full max-h-[200px] cursor-zoom-in"
                loading="lazy"
              />
              <div className="hidden group-hover:block absolute z-[100] top-0 left-full ml-3 p-2 bg-white dark:bg-gray-800 shadow-2xl rounded-md pointer-events-none">
                <img
                  src={imgSrc}
                  alt={`Content image ${index + 1} - Full size`}
                  className="object-contain max-w-[600px] max-h-[600px]"
                />
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};
