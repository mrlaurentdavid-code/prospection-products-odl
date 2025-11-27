"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Contact } from '@/lib/utils/validators';

// Régions disponibles pour le ciblage
const REGIONS = [
  { value: 'CH', label: '🇨🇭 Suisse', countries: ['Switzerland', 'Schweiz', 'Suisse'] },
  { value: 'DE', label: '🇩🇪 Allemagne', countries: ['Germany', 'Deutschland'] },
  { value: 'AT', label: '🇦🇹 Autriche', countries: ['Austria', 'Österreich'] },
  { value: 'FR', label: '🇫🇷 France', countries: ['France'] },
  { value: 'IT', label: '🇮🇹 Italie', countries: ['Italy', 'Italia'] },
  { value: 'NL', label: '🇳🇱 Pays-Bas', countries: ['Netherlands', 'Nederland'] },
  { value: 'BE', label: '🇧🇪 Belgique', countries: ['Belgium', 'België', 'Belgique'] },
  { value: 'UK', label: '🇬🇧 Royaume-Uni', countries: ['United Kingdom', 'UK', 'Great Britain'] },
  { value: 'ES', label: '🇪🇸 Espagne', countries: ['Spain', 'España'] },
  { value: 'PL', label: '🇵🇱 Pologne', countries: ['Poland', 'Polska'] },
  { value: 'EU', label: '🇪🇺 Europe (autre)', countries: ['Europe', 'EU'] },
  { value: 'DACH', label: '🏔️ DACH (DE-AT-CH)', countries: ['DACH'] },
  { value: 'OTHER', label: '🌍 Autre', countries: [] },
];

interface AddContactModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (contact: Contact) => Promise<void>;
  entityType: 'product' | 'brand';
  entityId: string;
  entityName: string;
}

export function AddContactModal({
  open,
  onClose,
  onAdd,
  entityType,
  entityId,
  entityName,
}: AddContactModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');

  const resetForm = () => {
    setName('');
    setTitle('');
    setEmail('');
    setLinkedinUrl('');
    setPhone('');
    setRegion('');
    setCity('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Le nom est requis';
    }
    if (!email.trim() && !linkedinUrl.trim()) {
      return 'Un email ou un profil LinkedIn est requis';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Email invalide';
    }
    if (linkedinUrl && !linkedinUrl.includes('linkedin.com')) {
      return 'URL LinkedIn invalide';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build location string
      let location = '';
      if (city && region) {
        const regionData = REGIONS.find(r => r.value === region);
        location = `${city}, ${regionData?.label.split(' ')[1] || region}`;
      } else if (region) {
        const regionData = REGIONS.find(r => r.value === region);
        location = regionData?.label.split(' ')[1] || region;
      } else if (city) {
        location = city;
      }

      const contact: Contact = {
        name: name.trim(),
        title: title.trim() || null,
        email: email.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        phone: phone.trim() || null,
        location: location || null,
        source: 'manual',
        confidence: 1.0, // Manual = 100% confidence
      };

      await onAdd(contact);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter un contact</DialogTitle>
          <DialogDescription>
            Ajouter manuellement un contact pour {entityType === 'product' ? 'le produit' : 'la marque'} "{entityName}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom (requis) */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
              required
            />
          </div>

          {/* Titre/Fonction */}
          <div className="space-y-2">
            <Label htmlFor="title">Fonction</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sales Manager DACH, Export Director..."
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="j.dupont@company.com"
            />
          </div>

          {/* LinkedIn URL */}
          <div className="space-y-2">
            <Label htmlFor="linkedin">Profil LinkedIn</Label>
            <Input
              id="linkedin"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/jeandupont"
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+41 79 123 45 67"
            />
          </div>

          {/* Région */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region">Région/Pays</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Zurich, Paris..."
              />
            </div>
          </div>

          {/* Info DACH/Europe */}
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            <strong>Conseil:</strong> Privilégiez les contacts responsables des marchés DACH (Allemagne, Autriche, Suisse) ou Europe pour maximiser les chances de partenariat avec O!deal.
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Ajout...' : 'Ajouter le contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
