import { createClient } from "@/lib/supabase/server";
import { QuickAnalyzeBrand } from "@/components/QuickAnalyzeBrand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Suspense } from "react";

interface BrandsPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function BrandsPage({ searchParams }: BrandsPageProps) {
  const supabase = await createClient();
  const params = await searchParams;

  // Récupérer les filtres
  const status = params.status && params.status !== 'all' ? params.status : null;

  // Récupérer les marques filtrées via RPC
  const { data: brands, error } = await supabase.rpc('get_prospection_brands_filtered', {
    p_status: status,
    p_categories: null,
    p_limit: 100,
    p_offset: 0,
  });

  if (error) {
    console.error('Error fetching brands:', error);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marques</h1>
          <p className="text-gray-600 mt-2">
            {brands?.length || 0} marque{(brands?.length || 0) > 1 ? 's' : ''} analysée{(brands?.length || 0) > 1 ? 's' : ''} par l'IA
          </p>
        </div>
        <Link
          href="/dashboard/products"
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          📦 Voir les produits
        </Link>
      </div>

      {/* Quick Analyze */}
      <QuickAnalyzeBrand />

      {/* Liste des marques */}
      {!brands || brands.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucune marque pour le moment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 text-6xl">🏢</div>
              <p className="text-gray-600 mb-2">
                Les marques analysées apparaîtront ici
              </p>
              <p className="text-sm text-gray-500">
                Collez une URL de marque ci-dessus pour commencer
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {brands.map((brand: any) => (
            <Link key={brand.id} href={`/dashboard/brands/${brand.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  {/* Logo */}
                  {brand.logo_url && (
                    <div className="w-full h-32 relative mb-4 flex items-center justify-center bg-gray-50 rounded-lg">
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="max-w-full max-h-full object-contain p-2"
                      />
                    </div>
                  )}
                  <CardTitle className="line-clamp-2">{brand.name}</CardTitle>
                  {brand.tagline && (
                    <p className="text-sm text-gray-600 line-clamp-1 mt-1">{brand.tagline}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {brand.description}
                  </p>

                  {/* Categories */}
                  {brand.categories && brand.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {brand.categories.slice(0, 3).map((cat: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Best sellers mini gallery */}
                  {brand.best_sellers && brand.best_sellers.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-gray-500 mb-2 font-medium">
                        🌟 {brand.best_sellers.length} best seller{brand.best_sellers.length > 1 ? 's' : ''}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {brand.best_sellers.slice(0, 3).map((product: any, idx: number) => (
                          product.image_url ? (
                            <div
                              key={idx}
                              className="aspect-square relative rounded overflow-hidden bg-gray-100"
                              title={product.name}
                            >
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              key={idx}
                              className="aspect-square relative rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs"
                            >
                              📦
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className={`text-xs px-2 py-1 rounded ${
                      brand.status === 'to_review' ? 'bg-amber-100 text-amber-800' :
                      brand.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                      brand.status === 'standby' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {brand.status === 'to_review' ? 'À réviser' :
                       brand.status === 'contacted' ? 'Contacté' :
                       brand.status === 'standby' ? 'En attente' :
                       'Archivé'}
                    </span>
                    {brand.company_country && (
                      <span className="text-xs text-gray-500">
                        🌍 {brand.company_country}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
