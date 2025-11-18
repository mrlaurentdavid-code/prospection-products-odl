import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/SettingsForm";
import { LogoutButton } from "@/components/LogoutButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const supabase = await createClient();

  // Récupérer ou créer le profil utilisateur
  const { data: profile, error } = await supabase.rpc('get_or_create_user_profile');

  // Gérer l'erreur plus gracieusement (migration peut ne pas être appliquée)
  const userProfile = profile?.[0] || {
    first_name: 'Prénom',
    last_name: 'Nom',
    title: 'Product Sourcing Manager',
    email: '',
    phone: '',
    signature: '',
  };

  const migrationNotApplied = !!error;

  if (error) {
    console.warn('Note: Migration 024 not yet applied. Using default profile.', error);
  }

  return (
    <div className="space-y-8">
      {/* Alerte si migration non appliquée */}
      {migrationNotApplied && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-1">
                  Migration 024 non appliquée
                </h3>
                <p className="text-sm text-orange-800 mb-3">
                  Pour utiliser les profils utilisateurs personnalisés, vous devez d'abord appliquer la migration 024 dans Supabase.
                </p>
                <div className="bg-white rounded p-3 border border-orange-200">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Étapes :</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    <li>Ouvrir Supabase Dashboard → SQL Editor</li>
                    <li>Copier le contenu de <code className="bg-gray-100 px-1 rounded text-xs">supabase/migrations/024_create_user_profiles.sql</code></li>
                    <li>Exécuter la requête</li>
                    <li>Recharger cette page</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire de profil */}
        <Card>
          <CardHeader>
            <CardTitle>Profil utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsForm profile={userProfile} disabled={migrationNotApplied} />
          </CardContent>
        </Card>

        {/* Aperçu de la signature */}
        <Card>
          <CardHeader>
            <CardTitle>Aperçu de la signature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                Votre signature apparaîtra ainsi dans les emails :
              </p>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-gray-900">
                  {userProfile.first_name} {userProfile.last_name}
                </p>
                <p className="text-gray-700">{userProfile.title || 'Votre Titre'}</p>
                <p className="text-gray-700">O!deal | Swiss E-Commerce Platform</p>
                <p className="text-blue-600">🌐 odeal.ch</p>
                {userProfile.email && (
                  <p className="text-gray-600">📧 {userProfile.email}</p>
                )}
                {userProfile.phone && (
                  <p className="text-gray-600">📞 {userProfile.phone}</p>
                )}
                {userProfile.signature && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-gray-600 whitespace-pre-wrap">{userProfile.signature}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info sur les templates */}
      <Card>
        <CardHeader>
          <CardTitle>Variables disponibles dans les templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              Les templates d'email utilisent les variables suivantes, qui seront automatiquement remplacées :
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
              <li>
                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{'{{sender_name}}'}</code> → {userProfile.first_name} {userProfile.last_name}
              </li>
              <li>
                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{'{{sender_title}}'}</code> → {userProfile.title || 'Votre titre'}
              </li>
              <li>
                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{'{{contact_name}}'}</code> → Prénom du contact
              </li>
              <li>
                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{'{{company_name}}'}</code> → Nom de l'entreprise
              </li>
              <li>
                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{'{{product_name}}'}</code> → Nom du produit
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Section Déconnexion */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900">Zone dangereuse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Déconnexion</p>
              <p className="text-sm text-gray-600 mt-1">
                Vous serez redirigé vers la page de connexion
              </p>
            </div>
            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
