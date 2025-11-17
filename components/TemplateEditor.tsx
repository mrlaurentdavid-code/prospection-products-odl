'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmailTemplate } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface TemplateEditorProps {
  template: EmailTemplate;
}

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

// Variables d'exemple pour la prévisualisation
const previewVariables = {
  company_name: 'Acme Corp',
  product_name: 'Premium Wireless Headphones',
  product_category: 'Electronics & Technology',
  sender_name: 'Laurent David',
  sender_title: 'Partnership Manager',
};

export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body_html);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Remplace les variables pour la prévisualisation
  const replaceVariables = (text: string) => {
    let result = text;
    Object.entries(previewVariables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/templates/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          subject,
          body_html: body,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      alert('✅ Template sauvegardé avec succès !');
      router.refresh();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('❌ Erreur lors de la sauvegarde du template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard/settings/templates">
            <Button variant="outline" className="mb-4">
              ← Retour aux templates
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {template.name}
          </h1>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {languageLabels[template.language]}
            </Badge>
            <Badge variant="outline">
              {typeLabels[template.type]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showPreview ? 'default' : 'outline'}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? '✏️ Éditer' : '👁️ Prévisualiser'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </Button>
        </div>
      </div>

      {!showPreview ? (
        /* Mode édition */
        <div className="grid gap-6">
          {/* Variables disponibles */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Variables disponibles</CardTitle>
              <CardDescription>
                Copiez-collez ces variables dans votre template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(previewVariables).map((variable) => (
                  <button
                    key={variable}
                    onClick={() => {
                      navigator.clipboard.writeText(`{{${variable}}}`);
                      alert(`✅ Variable {{${variable}}} copiée !`);
                    }}
                    className="px-3 py-2 bg-white rounded border text-sm hover:bg-gray-50 transition-colors text-left"
                  >
                    <code>{`{{${variable}}}`}</code>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sujet */}
          <Card>
            <CardHeader>
              <CardTitle>Sujet de l'email</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Partnership Opportunity with {{company_name}}"
                className="text-base"
              />
            </CardContent>
          </Card>

          {/* Corps */}
          <Card>
            <CardHeader>
              <CardTitle>Corps de l'email</CardTitle>
              <CardDescription>
                Format texte simple (les retours à la ligne seront préservés)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={20}
                className="w-full p-4 border rounded-md font-mono text-sm resize-y"
                placeholder="Hi,

I hope this email finds you well.

My name is {{sender_name}}..."
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Mode prévisualisation */
        <div className="grid gap-6">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Prévisualisation</CardTitle>
              <CardDescription>
                Voici à quoi ressemblera l'email avec des données d'exemple
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sujet */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Sujet:</p>
                <div className="p-4 bg-gray-50 rounded border">
                  <p className="font-semibold">{replaceVariables(subject)}</p>
                </div>
              </div>

              {/* Corps */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Corps:</p>
                <div className="p-6 bg-white rounded border">
                  <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                    {replaceVariables(body)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variables utilisées */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg">Variables utilisées dans la prévisualisation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(previewVariables).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-white rounded border text-sm">
                      {`{{${key}}}`}
                    </code>
                    <span className="text-gray-600">→</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
