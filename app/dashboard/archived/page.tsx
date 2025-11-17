import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/ProductCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function ArchivedProductsPage() {
  const supabase = await createClient();

  // Récupérer les produits archivés
  const { data: products, error } = await supabase.rpc('get_prospection_products_archived', {
    p_limit: 100,
    p_offset: 0,
  });

  if (error) {
    console.error('Error fetching archived products:', error);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/products"
          className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block"
        >
          ← Retour aux produits
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Archives</h1>
        <p className="text-gray-600 mt-2">
          {products?.length || 0} produit{(products?.length || 0) > 1 ? 's' : ''} archivé{(products?.length || 0) > 1 ? 's' : ''}
        </p>
      </div>

      {/* Liste des produits archivés */}
      {!products || products.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucun produit archivé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 text-6xl">🗄️</div>
              <p className="text-gray-600 mb-2">
                Les produits archivés apparaîtront ici
              </p>
              <p className="text-sm text-gray-500">
                Utilisez le bouton "Supprimer" pour archiver un produit
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
