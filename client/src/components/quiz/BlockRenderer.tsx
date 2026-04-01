import React from 'react';
import { RichTextContent } from '@/components/ui/RichTextContent';
import { useAuthAwareImageSrc } from '@/hooks/useAuthAwareImageSrc';

type Block =
  | { type: "text"; value: string }
  | { type: "image"; url: string };

interface BlockRendererProps {
  blocks: Block[];
  className?: string;
}

const FIREBASE_STORAGE_PREFIX = "https://storage.googleapis.com/gen-lang-client-0260042933.firebasestorage.app/";

function getImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith(FIREBASE_STORAGE_PREFIX)) {
    const storagePath = url.replace(FIREBASE_STORAGE_PREFIX, "");
    return `/api/image-proxy?path=${encodeURIComponent(storagePath)}`;
  }
  return url;
}

function QuizBlockImages({ imgSrc, index }: { imgSrc: string; index: number }) {
  const { displaySrc, status } = useAuthAwareImageSrc(imgSrc);
  if (status === "loading") {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400" aria-hidden>
        Loading image…
      </span>
    );
  }
  if (status === "error" || !displaySrc) {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400" title="Image unavailable">
        Image unavailable
      </span>
    );
  }
  return (
    <div className="relative inline-flex items-start justify-start max-w-[260px] max-h-[200px] overflow-visible rounded-md align-top shrink-0 group">
      <img
        src={displaySrc}
        alt={`Content image ${index + 1}`}
        className="object-contain w-full h-full max-h-[200px] cursor-zoom-in"
        loading="lazy"
      />
      <div className="hidden group-hover:block absolute z-[100] top-0 left-full ml-3 p-2 bg-white dark:bg-gray-800 shadow-2xl rounded-md pointer-events-none">
        <img
          src={displaySrc}
          alt={`Content image ${index + 1} - Full size`}
          className="object-contain max-w-[600px] max-h-[600px]"
        />
      </div>
    </div>
  );
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
            <RichTextContent key={index} className="text-gray-900 dark:text-white leading-relaxed prose prose-sm dark:prose-invert max-w-none">
              {text}
            </RichTextContent>
          );
        } else if (block.type === "image") {
          const imgSrc = getImageUrl(block.url);
          return <QuizBlockImages key={index} imgSrc={imgSrc} index={index} />;
        }
        return null;
      })}
    </div>
  );
};
