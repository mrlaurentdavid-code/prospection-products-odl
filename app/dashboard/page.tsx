import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuickAnalyze } from "@/components/QuickAnalyze";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Récupérer les stats des produits
  const { data: stats } = await supabase.rpc('get_prospection_products_stats');

  // Compter les produits par statut
  const toReviewCount = stats?.find((s: any) => s.status === 'to_review')?.count || 0;
  const contactedCount = stats?.find((s: any) => s.status === 'contacted')?.count || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Bienvenue sur Prospection-ODL - Système de veille produits avec IA
        </p>
      </div>

      {/* Quick Analyze */}
      <QuickAnalyze />

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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taux de réponse
            </CardTitle>
            <Badge variant="outline">--</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Moyenne 7 derniers jours
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
