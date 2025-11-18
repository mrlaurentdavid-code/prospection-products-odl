"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/lib/supabase/types";

interface LatestGemsHeaderProps {
  products: Product[];
}

function CompactProductCard({ product, onClick }: { product: Product; onClick: (e: React.MouseEvent) => void }) {
  const price = product.msrp_eu
    ? `${product.msrp_eu}€`
    : product.msrp_ch
    ? `${product.msrp_ch} CHF`
    : null;

  return (
    <div
      className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-3 min-w-[320px] md:min-w-[380px] hover:bg-white/20 hover:scale-105 transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Image TRÈS GRANDE - maintenant encore plus grande */}
      <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
        {product.images && product.images.length > 0 ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover"
            sizes="160px"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/30 text-5xl">
            📦
          </div>
        )}
      </div>

      {/* Content compact */}
      <div className="flex-1 min-w-0">
        <h3 className="text-white text-base font-bold line-clamp-2 mb-1 group-hover:text-white/90 transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 text-sm">
          {price && (
            <span className="text-white/90 font-semibold">
              {price}
            </span>
          )}
          {product.subcategory && (
            <Badge variant="secondary" className="text-xs bg-white/20 text-white border-none">
              {product.subcategory}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function LatestGemsHeader({ products }: LatestGemsHeaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const router = useRouter();

  // Si pas de produits, ne rien afficher
  if (!products || products.length === 0) {
    return null;
  }

  // Dupliquer les produits pour créer un effet de boucle infinie seamless
  const duplicatedProducts = [...products, ...products, ...products];

  const handleMouseDown = (e: React.MouseEvent) => {
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const deltaX = Math.abs(e.clientX - startPosRef.current.x);
    const deltaY = Math.abs(e.clientY - startPosRef.current.y);
    if (deltaX > 5 || deltaY > 5) {
      setIsDragging(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - startPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - startPosRef.current.y);
    if (deltaX > 5 || deltaY > 5) {
      setIsDragging(true);
    }
  };

  return (
    <div>
      {/* Titre au-dessus du bandeau */}
      <div className="container mx-auto px-4 mb-4">
        <h2 className="text-gray-900 text-xl md:text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
          Les dernières pépites
        </h2>
      </div>

      {/* Bandeau avec focus sur les produits */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 py-3 md:py-4 overflow-hidden relative">
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="flex gap-4 px-4 overflow-x-scroll scrollbar-hide cursor-grab active:cursor-grabbing"
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            {duplicatedProducts.map((product, index) => (
              <CompactProductCard
                key={`${product.id}-${index}`}
                product={product}
                onClick={(e) => {
                  if (!isDragging) {
                    router.push(`/dashboard/products/${product.id}`);
                  }
                }}
              />
            ))}
          </div>

          {/* Gradient fades on edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-purple-600 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-orange-500 to-transparent z-10" />
        </div>

        {/* Helper text */}
        <div className="text-center mt-3">
          <p className="text-white/60 text-xs">
            Glissez avec la souris • Survolez pour pause • Cliquez pour détails
          </p>
        </div>
      </div>
    </div>
  );
}
