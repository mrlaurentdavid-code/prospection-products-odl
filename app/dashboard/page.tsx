import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuickAnalyzeUnified } from "@/components/QuickAnalyzeUnified";
import { LatestGemsHeader } from "@/components/LatestGemsHeader";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Récupérer les stats des produits
  const { data: stats } = await supabase.rpc('get_prospection_products_stats');

  // Récupérer les 5 derniers produits pour le bandeau
  const { data: latestProducts } = await supabase.rpc('get_prospection_products_filtered', {
    p_status: null,
    p_category: null,
    p_subcategory: null,
    p_limit: 5,
    p_offset: 0,
  });

  // Compter les produits par statut
  const toReviewCount = stats?.find((s: any) => s.status === 'to_review')?.count || 0;
  const contactedCount = stats?.find((s: any) => s.status === 'contacted')?.count || 0;
  const archivedCount = stats?.find((s: any) => s.status === 'archived')?.count || 0;

  return (
    <div className="space-y-0">
      {/* Latest Gems Banner */}
      {latestProducts && latestProducts.length > 0 && (
        <div className="-mx-4 md:-mx-8 mb-8">
          <LatestGemsHeader products={latestProducts} />
        </div>
      )}

      <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Bienvenue sur Prospection-ODL - Système de veille produits avec IA
        </p>
      </div>

      {/* Quick Analyze */}
      <QuickAnalyzeUnified />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/products">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Produits à review
              </CardTitle>
              <Badge variant="secondary">{toReviewCount}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{toReviewCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                En attente d'analyse
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/contacted">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Contactés cette semaine
              </CardTitle>
              <Badge variant="default">{contactedCount}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contactedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Emails envoyés
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/archived">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Produits archivés
              </CardTitle>
              <Badge variant="outline">{archivedCount}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{archivedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Historique complet
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
      </div>
    </div>
  );
}
