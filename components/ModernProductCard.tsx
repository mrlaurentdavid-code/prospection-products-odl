"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Product } from "@/lib/supabase/types";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface ModernProductCardProps {
  product: Product;
}

const statusLabels = {
  to_review: "À réviser",
  standby: "En attente",
  contacted: "Contacté",
  archived: "Archivé",
};

const statusColors = {
  to_review: "bg-amber-100 text-amber-800",
  standby: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  archived: "bg-red-100 text-red-800",
};

export function ModernProductCard({ product }: ModernProductCardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showPrevNext, setShowPrevNext] = useState(false);

  const images = product.images || [];
  const hasMultipleImages = images.length > 1;

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const width = scrollContainerRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    setSelectedIndex(newIndex);
  };

  const scrollPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!scrollContainerRef.current) return;
    const width = scrollContainerRef.current.offsetWidth;
    scrollContainerRef.current.scrollBy({ left: -width, behavior: 'auto' });
  };

  const scrollNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!scrollContainerRef.current) return;
    const width = scrollContainerRef.current.offsetWidth;
    scrollContainerRef.current.scrollBy({ left: width, behavior: 'auto' });
  };

  const scrollTo = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!scrollContainerRef.current) return;
    const width = scrollContainerRef.current.offsetWidth;
    scrollContainerRef.current.scrollTo({ left: index * width, behavior: 'auto' });
  };

  const confidencePercentage = product.ai_confidence_score
    ? Math.round(product.ai_confidence_score * 100)
    : null;

  const price = product.msrp_eu
    ? `${product.msrp_eu}€`
    : product.msrp_ch
    ? `${product.msrp_ch} CHF`
    : null;

  return (
    <div>
      <Card className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer h-full flex flex-col">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-3">
            <CardTitle className="line-clamp-2 text-lg flex-1">
              {product.name}
            </CardTitle>
            <div className="flex gap-2 flex-shrink-0">
              <Badge className={statusColors[product.status]}>
                {statusLabels[product.status]}
              </Badge>
              {price ? (
                <Badge className="bg-blue-100 text-blue-800">
                  💰 {price}
                </Badge>
              ) : confidencePercentage ? (
                <Badge className="bg-emerald-100 text-emerald-800">
                  {confidencePercentage}%
                </Badge>
              ) : null}
            </div>
          </div>
          {product.subcategory && (
            <Badge variant="secondary" className="w-fit text-xs">
              {product.subcategory}
            </Badge>
          )}
        </CardHeader>

        {/* Image Carousel */}
        <div
          className="relative aspect-video bg-gray-100"
          onMouseEnter={() => setShowPrevNext(true)}
          onMouseLeave={() => setShowPrevNext(false)}
        >
          {images.length > 0 ? (
            <>
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex overflow-x-scroll scrollbar-hide h-full w-full"
                style={{
                  scrollSnapType: 'x mandatory',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-x',
                }}
              >
                {images.map((imageUrl, index) => (
                  <div
                    key={`${product.id}-img-${index}`}
                    className="flex-shrink-0 w-full h-full relative"
                    style={{
                      minWidth: '100%',
                      scrollSnapAlign: 'center',
                    }}
                  >
                    <Image
                      src={imageUrl}
                      alt={`${product.name} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>

              {/* Navigation Arrows (Desktop only) */}
              {hasMultipleImages && showPrevNext && (
                <>
                  <button
                    onClick={scrollPrev}
                    className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all z-10"
                    aria-label="Image précédente"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={scrollNext}
                    className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all z-10"
                    aria-label="Image suivante"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Dots Indicators */}
              {hasMultipleImages && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => scrollTo(index, e)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === selectedIndex
                          ? "bg-white scale-125"
                          : "bg-white/50 hover:bg-white/75"
                      }`}
                      aria-label={`Aller à l'image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <span className="text-4xl">📦</span>
            </div>
          )}
        </div>

        {/* Description Accordion */}
        <CardContent className="flex-1 pt-4">
          {product.description && (
            <Accordion type="single" collapsible>
              <AccordionItem value="description" className="border-none">
                <AccordionTrigger className="text-sm text-gray-600 hover:no-underline py-2">
                  <span className="line-clamp-2 text-left text-gray-700">
                    {product.description}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-600 pt-2">
                  {product.description}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>

        {/* Footer */}
        <CardFooter className="pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-3 text-xs text-gray-600 w-full">
            {confidencePercentage && (
              <div className="flex items-center gap-1">
                <span>🎯</span>
                <span className="font-medium text-emerald-700">
                  {confidencePercentage}% IA
                </span>
              </div>
            )}
            {product.company_country && (
              <div className="flex items-center gap-1">
                <span>🌍</span>
                <span>{product.company_country}</span>
              </div>
            )}
            {product.company_website && (
              <div className="flex items-center gap-1 group/link">
                <ExternalLink className="w-3 h-3" />
                <span className="group-hover/link:text-blue-600 transition-colors">
                  Website
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <span>📅</span>
              <span>
                {new Date(product.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
