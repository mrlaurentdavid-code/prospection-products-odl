"use client";

import { useState } from "react";

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  showPlaceholder?: boolean;
}

export function ProductImage({ src, alt, className, showPlaceholder = false }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed && !showPlaceholder) {
    return null;
  }

  return (
    <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
      {!failed ? (
        <img
          src={src}
          alt={alt}
          className={className || "w-full h-full object-cover"}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-4 text-gray-400">
          <svg
            className="w-12 h-12 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs">Image non disponible</span>
        </div>
      )}
    </div>
  );
}
