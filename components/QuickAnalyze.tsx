"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function QuickAnalyze() {
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
      setError('URL invalide. Exemple: https://example.com/product');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting analysis for:', url);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

      console.log('✅ Analysis completed:', data);

      // Rediriger vers le produit créé
      if (data.product?.id) {
        router.push(`/dashboard/products/${data.product.id}`);
      } else {
        router.push('/dashboard/products');
      }

      // Reset le formulaire
      setUrl('');
    } catch (error) {
      console.error('❌ Error analyzing URL:', error);
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
        <CardTitle>🔍 Analyse rapide</CardTitle>
        <CardDescription>
          Collez une URL de produit pour lancer une analyse automatique
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Input
            type="url"
            placeholder="https://example.com/products/mon-produit"
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
        <p className="text-xs text-gray-500 mt-3">
          Supporte: Instagram, Facebook, TikTok, sites e-commerce
        </p>
      </CardContent>
    </Card>
  );
}
