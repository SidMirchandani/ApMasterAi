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
    <div className={`min-w-0 space-y-1 overflow-x-auto [overflow-y:visible] ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "text") {
          const text = block.value || (block as any).content || "";
          if (!text) return null;
          return (
            <RichTextContent
              key={index}
              className="
                min-w-0 max-w-full break-words text-gray-900 dark:text-white leading-relaxed prose prose-sm dark:prose-invert max-w-none
                prose-img:max-w-full prose-table:block prose-table:max-w-full prose-table:overflow-x-auto
                /* VS Code-like editor styling for code blocks */
                prose-pre:font-mono prose-pre:text-xs sm:prose-pre:text-sm prose-pre:leading-relaxed prose-pre:max-w-full prose-pre:overflow-x-auto
                prose-pre:bg-[#f3f3f3] prose-pre:text-[#333333] prose-pre:border prose-pre:border-[#d4d4d4]
                prose-pre:rounded-[6px] prose-pre:px-3 prose-pre:py-3 sm:prose-pre:px-4 prose-pre:shadow-sm
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
              className="group relative mx-auto flex w-full max-w-full justify-center sm:mx-0 sm:inline-flex sm:max-w-[min(100%,260px)]"
            >
              <img
                src={imgSrc}
                alt={`Content image ${index + 1}`}
                className="h-auto max-h-[min(50vh,220px)] w-full max-w-full cursor-zoom-in object-contain sm:max-h-[200px]"
                loading="lazy"
              />
              <div className="pointer-events-none absolute left-full top-0 z-[100] ml-3 hidden rounded-md bg-white p-2 shadow-2xl group-hover:block dark:bg-gray-800 max-sm:hidden">
                <img
                  src={imgSrc}
                  alt={`Content image ${index + 1} - Full size`}
                  className="max-h-[600px] max-w-[min(100vw,600px)] object-contain"
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
