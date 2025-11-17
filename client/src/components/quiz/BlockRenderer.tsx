
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
            <img
              key={index}
              src={block.url}
              alt={`Content image ${index + 1}`}
              className="rounded-md my-2 max-w-full h-auto"
              loading="lazy"
            />
          );
        }
        return null;
      })}
    </div>
  );
};
