"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface ImageGalleryManagerProps {
  productId: string;
  images: string[];
  onUpdate?: () => void;
}

export function ImageGalleryManager({ productId, images: initialImages, onUpdate }: ImageGalleryManagerProps) {
  const [images, setImages] = useState<string[]>(initialImages || []);
  const [saving, setSaving] = useState(false);

  const handleSetPrimary = async (index: number) => {
    if (index === 0) return; // Already primary

    const newImages = [...images];
    const [primaryImage] = newImages.splice(index, 1);
    newImages.unshift(primaryImage);

    setImages(newImages);
    await saveImages(newImages);
  };

  const handleDelete = async (index: number) => {
    if (images.length === 1) {
      alert('Vous ne pouvez pas supprimer la dernière image');
      return;
    }

    const confirmed = confirm('Voulez-vous vraiment supprimer cette image ?');
    if (!confirmed) return;

    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    await saveImages(newImages);
  };

  const saveImages = async (newImages: string[]) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: newImages }),
      });

      if (!response.ok) {
        throw new Error('Failed to update images');
      }

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating images:', error);
      alert('Erreur lors de la mise à jour des images');
      // Revert to initial images on error
      setImages(initialImages);
    } finally {
      setSaving(false);
    }
  };

  if (!images || images.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🖼️ Images</CardTitle>
          <CardDescription>Aucune image disponible</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">🖼️ Images ({images.length})</CardTitle>
        <CardDescription>
          La première image est l'image principale. Cliquez pour réorganiser ou supprimer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((imageUrl, index) => (
            <div
              key={index}
              className="relative group border rounded-lg overflow-hidden bg-gray-50 aspect-square"
            >
              {/* Image */}
              <div className="relative w-full h-full">
                <Image
                  src={imageUrl}
                  alt={`Product image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>

              {/* Primary badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 z-10">
                  <Badge className="bg-blue-600 text-white">
                    ⭐ Principale
                  </Badge>
                </div>
              )}

              {/* Action buttons - visible on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {index !== 0 && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSetPrimary(index)}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      ⭐ Définir principale
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(index)}
                    disabled={saving || images.length === 1}
                  >
                    🗑️ Supprimer
                  </Button>
                </div>
              </div>

              {/* Saving indicator */}
              {saving && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                  <div className="text-sm text-gray-600">Enregistrement...</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Help text */}
        <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded border">
          <p className="font-medium mb-1">💡 Conseils:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Survolez une image pour afficher les actions</li>
            <li>L'image principale s'affiche en premier partout dans l'app</li>
            <li>Vous devez avoir au moins 1 image</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
