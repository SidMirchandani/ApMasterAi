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
    <div className={`space-y-2 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "text") {
          return (
            <p key={index} className="text-gray-800 leading-relaxed">
              {block.value}
            </p>
          );
        } else if (block.type === "image") {
          return (
            <div key={index} className="relative inline-block group max-w-[240px] my-1">
              <img
                src={block.url}
                alt={`Content image ${index + 1}`}
                className="w-full h-auto object-contain rounded-md shadow cursor-pointer"
                loading="lazy"
              />
              <div className="absolute left-0 top-0 z-50 hidden group-hover:block">
                <img
                  src={block.url}
                  alt={`Content image ${index + 1} preview`}
                  className="max-w-[600px] max-h-[600px] object-contain rounded-md shadow-xl bg-white p-2"
                  loading="lazy"
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