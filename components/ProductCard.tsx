"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/lib/supabase/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const statusColors = {
    to_review: "bg-yellow-100 text-yellow-800",
    standby: "bg-gray-100 text-gray-800",
    contacted: "bg-blue-100 text-blue-800",
    archived: "bg-red-100 text-red-800",
  };

  const statusLabels = {
    to_review: "À réviser",
    standby: "En attente",
    contacted: "Contacté",
    archived: "Archivé",
  };

  const confidenceColor = (score: number | null) => {
    if (!score) return "bg-gray-100 text-gray-800";
    if (score >= 0.8) return "bg-green-100 text-green-800";
    if (score >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Link href={`/dashboard/products/${product.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 truncate">
                {product.name}
              </h3>
              {product.company_name && (
                <p className="text-sm text-gray-600 truncate">
                  {product.company_name}
                </p>
              )}

              {/* Catégorie et sous-catégorie */}
              {(product.category || product.subcategory) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {product.subcategory && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                      {product.subcategory}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end">
              <Badge className={statusColors[product.status]}>
                {statusLabels[product.status]}
              </Badge>
              {product.ai_confidence_score !== null && (
                <Badge
                  variant="outline"
                  className={confidenceColor(product.ai_confidence_score)}
                >
                  {Math.round(product.ai_confidence_score * 100)}%
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {product.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {product.source_type && (
              <span className="inline-flex items-center gap-1">
                📱 {product.source_type}
              </span>
            )}
            {product.msrp_eu && (
              <span className="inline-flex items-center gap-1">
                💰 {product.msrp_eu}€
              </span>
            )}
            {product.company_country && (
              <span className="inline-flex items-center gap-1">
                🌍 {product.company_country}
              </span>
            )}
          </div>

          {product.images && product.images.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.images.slice(0, 3).map((img, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-16 h-16 rounded bg-gray-100 overflow-hidden"
                >
                  <img
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const parent = e.currentTarget.parentElement;
                      if (parent) parent.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-xs text-gray-400">
            {new Date(product.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
