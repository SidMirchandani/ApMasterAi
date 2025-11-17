import React from 'react';

type Block =
  | { type: "text"; value: string }
  | { type: "image"; url: string };

interface BlockRendererProps {
  blocks: Block[];
  className?: string;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ blocks, className = "" }) => {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "text") {
          return (
            <p key={index} className="text-gray-800 leading-snug">
              {block.value}
            </p>
          );
        } else if (block.type === "image") {
          return (
            <div key={index} className="relative inline-flex items-start justify-start max-w-[260px] max-h-[200px] overflow-visible rounded-md cursor-zoom-in align-top shrink-0 group">
              <img
                src={block.url}
                alt={`Content image ${index + 1}`}
                className="object-contain w-full h-full max-h-[200px] pointer-events-none select-none"
                loading="lazy"
              />
              <div className="hidden group-hover:block absolute z-[100] top-0 left-full ml-3 p-2 bg-white shadow-2xl rounded-md max-w-[90vw] max-h-[90vh] pointer-events-none">
                <img
                  src={block.url}
                  alt={`Content image ${index + 1} - Full size`}
                  className="object-contain w-full h-full"
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