import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Contact } from "@/lib/utils/validators";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  contact_name: string;
  contact_title: string;
  sent_at: string;
}

export default async function ContactedProductsPage() {
  const supabase = await createClient();

  // Récupérer tous les produits contactés
  const { data: products, error } = await supabase
    .rpc('get_prospection_products')
    .eq('status', 'contacted')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching contacted products:', error);
  }

  // Récupérer les emails envoyés pour chaque produit
  const productIds = products?.map((p: any) => p.id) || [];
  const { data: emailLogs } = await supabase.rpc('get_email_logs_by_products', {
    p_product_ids: productIds,
  });

  // Grouper les emails par product_id (garder le plus récent)
  const emailsByProduct = new Map<string, EmailLog>();
  emailLogs?.forEach((log: any) => {
    if (!emailsByProduct.has(log.product_id)) {
      emailsByProduct.set(log.product_id, log);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block"
        >
          ← Retour au dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Produits contactés</h1>
        <p className="text-gray-600 mt-2">
          Liste des produits dont les contacts ont été sollicités
        </p>
      </div>

      {/* Liste des produits */}
      {!products || products.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">Aucun produit contacté pour le moment</p>
              <p className="text-sm mt-2">Les produits contactés apparaîtront ici</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {products.map((product: any) => {
            const emailLog = emailsByProduct.get(product.id);

            return (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link href={`/dashboard/products/${product.id}`}>
                        <CardTitle className="text-xl hover:text-blue-600 cursor-pointer">
                          {product.name}
                        </CardTitle>
                      </Link>
                      {product.company_name && (
                        <p className="text-sm text-gray-600 mt-1">
                          🏢 {product.company_name}
                        </p>
                      )}
                      {product.category && (
                        <Badge variant="secondary" className="mt-2">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      ✅ Contacté
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  {emailLog ? (
                    <div className="space-y-4">
                      {/* Contact sollicité */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          👤 Contact sollicité
                        </h4>
                        <p className="font-medium text-gray-900">{emailLog.contact_name}</p>
                        {emailLog.contact_title && (
                          <p className="text-sm text-gray-600 mt-0.5">{emailLog.contact_title}</p>
                        )}
                        <a
                          href={`mailto:${emailLog.to_email}`}
                          className="text-sm text-blue-600 hover:underline block mt-1"
                        >
                          📧 {emailLog.to_email}
                        </a>
                      </div>

                      {/* Email envoyé */}
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="email">
                          <AccordionTrigger className="text-sm font-semibold text-gray-700">
                            📧 Voir l'email envoyé
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Sujet:</p>
                                <p className="text-sm text-gray-900 mt-1">{emailLog.subject}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Message:</p>
                                <pre className="text-sm text-gray-900 mt-1 whitespace-pre-wrap font-sans">
                                  {emailLog.body}
                                </pre>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      {/* Date d'envoi */}
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Email envoyé le{' '}
                          {new Date(emailLog.sent_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Aucun email enregistré pour ce produit</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
