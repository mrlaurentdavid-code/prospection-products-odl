"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function QuickAnalyzeUnified() {
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'product' | 'brand'>('product');
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
      console.log(`🚀 Starting ${type} analysis for:`, url);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

      console.log('✅ Analysis completed:', data);

      // Rediriger vers la page appropriée
      if (type === 'product' && data.product?.id) {
        router.push(`/dashboard/products/${data.product.id}`);
      } else if (type === 'brand' && data.brand?.id) {
        router.push(`/dashboard/brands/${data.brand.id}`);
      } else {
        router.push(type === 'product' ? '/dashboard/products' : '/dashboard/brands');
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
          Choisissez le type d'analyse et collez une URL
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle Product / Brand */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={type === 'product' ? 'default' : 'outline'}
            onClick={() => setType('product')}
            className="flex-1"
            disabled={loading}
          >
            📦 Produit
          </Button>
          <Button
            type="button"
            variant={type === 'brand' ? 'default' : 'outline'}
            onClick={() => setType('brand')}
            className="flex-1"
            disabled={loading}
          >
            🏢 Marque
          </Button>
        </div>

        {/* URL Input */}
        <div className="flex gap-3">
          <Input
            type="url"
            placeholder={
              type === 'product'
                ? 'https://example.com/products/mon-produit'
                : 'https://example.com ou https://example.com/about'
            }
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

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-600">
            ⚠️ {error}
          </p>
        )}

        {/* Description contextuelle */}
        <p className="text-xs text-gray-500">
          {type === 'product' ? (
            <>
              <strong>Mode Produit:</strong> Analyse un produit spécifique (prix, caractéristiques, catégorie)
            </>
          ) : (
            <>
              <strong>Mode Marque:</strong> Analyse une marque entière (logo, best sellers, univers)
            </>
          )}
        </p>

        <p className="text-xs text-gray-500">
          Supporte: Instagram, Facebook, TikTok, sites e-commerce
        </p>
      </CardContent>
    </Card>
  );
}
