import { createClient } from '@/lib/supabase/server';
import { EmailTemplate } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const languageLabels = {
  en: '🇬🇧 English',
  fr: '🇫🇷 Français',
  de: '🇩🇪 Deutsch',
  it: '🇮🇹 Italiano',
};

const typeLabels = {
  first_contact: 'Premier contact',
  followup_1: 'Relance 1',
  followup_2: 'Relance 2',
  custom: 'Personnalisé',
};

export default async function TemplatesPage() {
  const supabase = await createClient();

  const { data: templates, error } = await supabase
    .rpc('get_email_templates') as { data: EmailTemplate[] | null; error: any };

  if (error) {
    console.error('Error fetching templates:', error);
  }

  return (
    <div className="space-y-6">
      {/* Variables disponibles */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Variables disponibles</CardTitle>
          <CardDescription>
            Utilisez ces variables dans vos templates (elles seront automatiquement remplacées)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <code className="px-3 py-2 bg-white rounded border text-sm">
              {'{{company_name}}'}
            </code>
            <code className="px-3 py-2 bg-white rounded border text-sm">
              {'{{product_name}}'}
            </code>
            <code className="px-3 py-2 bg-white rounded border text-sm">
              {'{{product_category}}'}
            </code>
            <code className="px-3 py-2 bg-white rounded border text-sm">
              {'{{sender_name}}'}
            </code>
            <code className="px-3 py-2 bg-white rounded border text-sm">
              {'{{sender_title}}'}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Liste des templates */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Badge variant="secondary" className="mb-2">
                  {languageLabels[template.language]}
                </Badge>
                <Badge variant="outline">
                  {typeLabels[template.type]}
                </Badge>
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Sujet</p>
                  <p className="text-sm text-gray-900 line-clamp-2">
                    {template.subject || <span className="text-gray-400 italic">Vide</span>}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Corps</p>
                  <p className="text-sm text-gray-900 line-clamp-3">
                    {template.body_html || <span className="text-gray-400 italic">Vide</span>}
                  </p>
                </div>
                <Link href={`/dashboard/settings/templates/${template.id}`}>
                  <Button className="w-full mt-2">
                    ✏️ Éditer
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!templates || templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucun template trouvé</p>
        </div>
      )}
    </div>
  );
}
