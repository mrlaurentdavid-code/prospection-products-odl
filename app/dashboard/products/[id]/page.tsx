import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/ProductImage";
import { Product } from "@/lib/supabase/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Récupérer le produit via RPC
  const { data: products, error } = await supabase.rpc('get_prospection_product_by_id', {
    p_product_id: id,
  });

  if (error || !products || products.length === 0) {
    notFound();
  }

  const product: Product = products[0];

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
    <div className="space-y-6">
      {/* Header avec bouton retour */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/products"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Retour aux produits
        </Link>
      </div>

      {/* Titre et badges */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            {product.company_name && (
              <p className="text-xl text-gray-600 mt-2">{product.company_name}</p>
            )}

            {/* Catégorie et sous-catégorie */}
            {(product.category || product.subcategory) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {product.category && (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                    📂 {product.category}
                  </Badge>
                )}
                {product.subcategory && (
                  <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                    🏷️ {product.subcategory}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 items-end">
            <Badge className={statusColors[product.status]}>
              {statusLabels[product.status]}
            </Badge>
            {product.ai_confidence_score !== null && (
              <Badge
                variant="outline"
                className={confidenceColor(product.ai_confidence_score)}
              >
                Confiance: {Math.round(product.ai_confidence_score * 100)}%
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          {product.images && product.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Image principale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Première image en grand */}
                <div className="w-full max-w-2xl mx-auto">
                  <ProductImage
                    src={product.images[0]}
                    alt={product.name}
                    showPlaceholder={true}
                  />
                </div>

                {/* Autres images dans un accordion */}
                {product.images.length > 1 && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="more-images">
                      <AccordionTrigger className="text-sm text-gray-600">
                        Voir plus d'images ({product.images.length - 1})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                          {product.images.slice(1).map((img, idx) => (
                            <ProductImage
                              key={idx + 1}
                              src={img}
                              alt={`${product.name} ${idx + 2}`}
                              showPlaceholder={true}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {product.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {product.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Source */}
          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">URL:</span>
                <a
                  href={product.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline break-all"
                >
                  {product.source_url}
                </a>
              </div>
              <div>
                <span className="text-sm text-gray-600">Type:</span>
                <span className="ml-2 text-gray-900">{product.source_type}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Prix */}
          {(product.msrp_eu || product.msrp_ch) && (
            <Card>
              <CardHeader>
                <CardTitle>Prix de marché (MSRP)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {product.msrp_eu && (
                  <div>
                    <span className="text-sm text-gray-600">Europe:</span>
                    <p className="text-2xl font-bold text-gray-900">
                      {product.msrp_eu}€
                    </p>
                  </div>
                )}
                {product.msrp_ch && (
                  <div>
                    <span className="text-sm text-gray-600">Suisse:</span>
                    <p className="text-2xl font-bold text-gray-900">
                      {product.msrp_ch} CHF
                    </p>
                  </div>
                )}
                {product.msrp_source_url && (
                  <a
                    href={product.msrp_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Voir la source
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Entreprise */}
          <Card>
            <CardHeader>
              <CardTitle>Entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.company_name && (
                <div>
                  <span className="text-sm text-gray-600">Nom:</span>
                  <p className="text-gray-900 font-medium">{product.company_name}</p>
                </div>
              )}
              {product.company_country && (
                <div>
                  <span className="text-sm text-gray-600">Pays:</span>
                  <p className="text-gray-900">{product.company_country}</p>
                </div>
              )}
              {product.company_website && (
                <div>
                  <span className="text-sm text-gray-600">Site web:</span>
                  <a
                    href={product.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:underline break-all"
                  >
                    {product.company_website}
                  </a>
                </div>
              )}
              {product.company_email && (
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <a
                    href={`mailto:${product.company_email}`}
                    className="block text-blue-600 hover:underline"
                  >
                    {product.company_email}
                  </a>
                </div>
              )}
              {product.company_linkedin && (
                <div>
                  <span className="text-sm text-gray-600">LinkedIn:</span>
                  <a
                    href={product.company_linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:underline break-all"
                  >
                    Voir le profil
                  </a>
                </div>
              )}
              {product.company_has_ecommerce && (
                <div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    E-commerce disponible
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Métadonnées */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Analysé le:</span>
                <p className="text-gray-900">
                  {new Date(product.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {product.reviewed_at && product.reviewed_by && (
                <div>
                  <span className="text-sm text-gray-600">Révisé par:</span>
                  <p className="text-gray-900">{product.reviewed_by}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(product.reviewed_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
