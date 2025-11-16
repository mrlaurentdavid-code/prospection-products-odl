import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/ProductCard";
import { ProductsFilters } from "@/components/ProductsFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Product } from "@/lib/supabase/types";
import { Suspense } from "react";

interface ProductsPageProps {
  searchParams: Promise<{
    status?: string;
    category?: string;
    subcategory?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const supabase = await createClient();
  const params = await searchParams;

  // Récupérer les filtres
  const status = params.status && params.status !== 'all' ? params.status : null;
  const category = params.category && params.category !== 'all' ? params.category : null;
  const subcategory = params.subcategory && params.subcategory !== 'all' ? params.subcategory : null;

  // Récupérer les produits filtrés via RPC
  const { data: products, error } = await supabase.rpc('get_prospection_products_filtered', {
    p_status: status,
    p_category: category,
    p_subcategory: subcategory,
    p_limit: 100,
    p_offset: 0,
  });

  // Récupérer les catégories et sous-catégories pour les filtres
  const { data: categoriesData } = await supabase.rpc('get_prospection_categories');
  const { data: subcategoriesData } = await supabase.rpc('get_prospection_subcategories');

  const categories = categoriesData?.map((c: any) => c.category) || [];
  const subcategories = subcategoriesData?.map((s: any) => s.subcategory) || [];

  if (error) {
    console.error('Error fetching products:', error);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Produits</h1>
        <p className="text-gray-600 mt-2">
          {products?.length || 0} produit{(products?.length || 0) > 1 ? 's' : ''} analysé{(products?.length || 0) > 1 ? 's' : ''} par l'IA
        </p>
      </div>

      {/* Filtres */}
      <Suspense fallback={<div>Chargement des filtres...</div>}>
        <ProductsFilters categories={categories} subcategories={subcategories} />
      </Suspense>

      {/* Liste des produits */}
      {!products || products.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucun produit pour le moment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 text-6xl">📦</div>
              <p className="text-gray-600 mb-2">
                Les produits analysés apparaîtront ici
              </p>
              <p className="text-sm text-gray-500">
                Envoyez un lien via Telegram ou testez avec l'API /api/analyze
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
