"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

interface UserProfile {
  first_name: string;
  last_name: string;
  title: string;
  email: string | null;
  phone: string | null;
  signature: string | null;
}

interface SettingsFormProps {
  profile: UserProfile;
  disabled?: boolean;
}

export function SettingsForm({ profile, disabled = false }: SettingsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    title: profile.title || 'Product Sourcing Manager',
    email: profile.email || '',
    phone: profile.phone || '',
    signature: profile.signature || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      alert('✅ Profil enregistré avec succès !');
      router.refresh();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('❌ Erreur lors de l\'enregistrement du profil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Prénom */}
      <div className="space-y-2">
        <Label htmlFor="first_name">Prénom *</Label>
        <Input
          id="first_name"
          value={formData.first_name}
          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          placeholder="Laurent"
          required
          disabled={disabled}
        />
      </div>

      {/* Nom */}
      <div className="space-y-2">
        <Label htmlFor="last_name">Nom *</Label>
        <Input
          id="last_name"
          value={formData.last_name}
          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          placeholder="David"
          required
          disabled={disabled}
        />
      </div>

      {/* Titre / Fonction */}
      <div className="space-y-2">
        <Label htmlFor="title">Titre / Fonction *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="CEO & Co-Founder"
          required
          disabled={disabled}
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email professionnel</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="laurent@odeal.ch"
          disabled={disabled}
        />
        <p className="text-xs text-gray-500">
          Optionnel - Affiché dans la signature
        </p>
      </div>

      {/* Téléphone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+41 XX XXX XX XX"
          disabled={disabled}
        />
        <p className="text-xs text-gray-500">
          Optionnel - Affiché dans la signature
        </p>
      </div>

      {/* Signature personnalisée */}
      <div className="space-y-2">
        <Label htmlFor="signature">Signature personnalisée</Label>
        <Textarea
          id="signature"
          value={formData.signature}
          onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
          placeholder="Note ou citation personnelle (optionnel)"
          rows={3}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500">
          Optionnel - Ajouté à la fin de vos emails
        </p>
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={saving || disabled}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
