
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
            <div key={index} className="max-w-[280px] max-h-[280px] overflow-hidden rounded-md cursor-zoom-in my-2">
              <img
                src={block.url}
                alt={`Content image ${index + 1}`}
                className="object-contain w-full h-full hover:scale-150 transition-transform duration-200"
                loading="lazy"
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};
