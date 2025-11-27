import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandStatusBadge } from "@/components/BrandStatusBadge";
import { BrandContactsSection } from "@/components/BrandContactsSection";

interface BrandDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BrandDetailPage({ params }: BrandDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Récupérer la marque
  const { data: brand, error } = await supabase
    .rpc('get_prospection_brand_by_id', {
      p_brand_id: id,
    });

  if (error || !brand) {
    console.error('Error fetching brand:', error);
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/dashboard/brands"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux marques
      </Link>

      {/* Header with logo */}
      <div className="flex items-start gap-6">
        {brand.logo_url && (
          <div className="w-32 h-32 relative flex-shrink-0 bg-white rounded-lg p-4 border">
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-4xl font-bold text-gray-900">{brand.name}</h1>
          {brand.tagline && (
            <p className="text-xl text-gray-600 mt-2">{brand.tagline}</p>
          )}
          <div className="flex items-center gap-3 mt-4">
            <BrandStatusBadge brandId={brand.id} currentStatus={brand.status} />
            {brand.ai_confidence_score && (
              <span className="text-sm bg-emerald-100 text-emerald-800 px-3 py-1 rounded">
                {Math.round(brand.ai_confidence_score * 100)}% confiance IA
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>À propos de la marque</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-line">{brand.description}</p>
        </CardContent>
      </Card>

      {/* Best Sellers */}
      {brand.best_sellers && brand.best_sellers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🌟 Best Sellers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {brand.best_sellers.map((bs: any, idx: number) => (
                <div key={idx} className="text-center">
                  <div className="aspect-square relative rounded-lg overflow-hidden mb-2 bg-gray-100 flex items-center justify-center">
                    {bs.image_url ? (
                      <img
                        src={bs.image_url}
                        alt={bs.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400 text-4xl">📦</div>
                    )}
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{bs.name}</p>
                  {bs.category && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded mt-1 inline-block">
                      {bs.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {brand.categories && brand.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Catégories de produits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {brand.categories.map((cat: string) => (
                <span key={cat} className="bg-blue-100 text-blue-800 px-3 py-1 rounded">
                  {cat}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informations entreprise</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {brand.company_name && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Nom</dt>
                <dd className="text-gray-900">{brand.company_name}</dd>
              </div>
            )}
            {brand.company_parent && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Société mère</dt>
                <dd className="text-gray-900">{brand.company_parent}</dd>
              </div>
            )}
            {brand.company_website && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Site web</dt>
                <dd>
                  <a
                    href={brand.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {brand.company_website}
                  </a>
                </dd>
              </div>
            )}
            {brand.company_email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd>
                  <a href={`mailto:${brand.company_email}`} className="text-blue-600 hover:underline">
                    {brand.company_email}
                  </a>
                </dd>
              </div>
            )}
            {brand.company_linkedin && (
              <div>
                <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
                <dd>
                  <a
                    href={brand.company_linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Voir le profil
                  </a>
                </dd>
              </div>
            )}
            {brand.company_country && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Pays</dt>
                <dd className="text-gray-900">🌍 {brand.company_country}</dd>
              </div>
            )}
            {brand.company_founded_year && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Fondée en</dt>
                <dd className="text-gray-900">{brand.company_founded_year}</dd>
              </div>
            )}
            {brand.company_has_ecommerce !== null && (
              <div>
                <dt className="text-sm font-medium text-gray-500">E-commerce</dt>
                <dd className="text-gray-900">
                  {brand.company_has_ecommerce ? '✅ Oui' : '❌ Non'}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Contacts - Toujours affiché pour permettre l'ajout manuel */}
      <BrandContactsSection
        contacts={brand.contacts || []}
        brandId={brand.id}
        brandName={brand.name}
        brandDescription={brand.description}
        companyName={brand.company_name}
        categories={brand.categories || []}
      />

      {/* Brand Images */}
      {brand.brand_images && brand.brand_images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Visuels de la marque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {brand.brand_images.map((img: string, idx: number) => (
                <div key={idx} className="aspect-video relative rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                  {img ? (
                    <img
                      src={img}
                      alt={`${brand.name} visual ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 text-4xl">🖼️</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
