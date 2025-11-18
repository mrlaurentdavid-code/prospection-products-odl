"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function QuickAnalyzeBrand() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Veuillez entrer une URL');
      return;
    }

    // Validation simple d'URL
    try {
      new URL(url);
    } catch {
      setError('URL invalide. Exemple: https://example.com');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting brand analysis for:', url);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          type: 'brand' // This is the key difference
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

      console.log('✅ Brand analysis completed:', data);

      // Rediriger vers la marque créée
      if (data.brand?.id) {
        router.push(`/dashboard/brands/${data.brand.id}`);
      } else {
        router.push('/dashboard/brands');
      }

      // Reset le formulaire
      setUrl('');
    } catch (error) {
      console.error('❌ Error analyzing brand:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleAnalyze();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🏢 Analyse de marque</CardTitle>
        <CardDescription>
          Collez l'URL de la homepage ou page "About" d'une marque pour analyser son univers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Input
            type="url"
            placeholder="https://example.com ou https://example.com/about"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse...
              </>
            ) : (
              'Analyser'
            )}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-600 mt-2">
            ⚠️ {error}
          </p>
        )}
        <div className="space-y-2 mt-3">
          <p className="text-xs text-gray-500">
            Focus sur: logo, best sellers, univers de la marque, catégories
          </p>
          <p className="text-xs text-blue-600">
            💡 Vous cherchez à analyser un <strong>produit spécifique</strong> plutôt qu'une marque entière ?{' '}
            <a href="/dashboard/products" className="underline hover:text-blue-800">
              Cliquez ici pour analyser un produit
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
