"use client";

import { useState, useEffect } from 'react';
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
  { value: '', label: 'Non spécifié' },
  { value: 'CH', label: 'Suisse', countries: ['Switzerland', 'Schweiz', 'Suisse'] },
  { value: 'DE', label: 'Allemagne', countries: ['Germany', 'Deutschland'] },
  { value: 'AT', label: 'Autriche', countries: ['Austria', 'Österreich'] },
  { value: 'FR', label: 'France', countries: ['France'] },
  { value: 'IT', label: 'Italie', countries: ['Italy', 'Italia'] },
  { value: 'NL', label: 'Pays-Bas', countries: ['Netherlands', 'Nederland'] },
  { value: 'BE', label: 'Belgique', countries: ['Belgium', 'België', 'Belgique'] },
  { value: 'UK', label: 'Royaume-Uni', countries: ['United Kingdom', 'UK', 'Great Britain'] },
  { value: 'ES', label: 'Espagne', countries: ['Spain', 'España'] },
  { value: 'PL', label: 'Pologne', countries: ['Poland', 'Polska'] },
  { value: 'EU', label: 'Europe (autre)', countries: ['Europe', 'EU'] },
  { value: 'OTHER', label: 'Autre', countries: [] },
];

interface EditContactModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (contact: Contact, index: number) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
  contact: Contact;
  contactIndex: number;
}

export function EditContactModal({
  open,
  onClose,
  onSave,
  onDelete,
  contact,
  contactIndex,
}: EditContactModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');

  // Initialiser le formulaire avec les données du contact
  useEffect(() => {
    if (contact && open) {
      setName(contact.name || '');
      setTitle(contact.title || '');
      setEmail(contact.email || '');
      setLinkedinUrl(contact.linkedin_url || '');
      setPhone(contact.phone || '');

      // Parser la location pour extraire ville et région
      if (contact.location) {
        const parts = contact.location.split(',').map(s => s.trim());
        if (parts.length >= 2) {
          setCity(parts[0]);
          // Essayer de matcher le pays avec une région
          const countryPart = parts[parts.length - 1].toLowerCase();
          const matchedRegion = REGIONS.find(r =>
            r.countries?.some(c => countryPart.includes(c.toLowerCase()))
          );
          setRegion(matchedRegion?.value || '');
        } else if (parts.length === 1) {
          // Vérifier si c'est une ville ou un pays
          const matchedRegion = REGIONS.find(r =>
            r.countries?.some(c => parts[0].toLowerCase().includes(c.toLowerCase()))
          );
          if (matchedRegion) {
            setRegion(matchedRegion.value);
            setCity('');
          } else {
            setCity(parts[0]);
            setRegion('');
          }
        }
      } else {
        setCity('');
        setRegion('');
      }
      setError(null);
    }
  }, [contact, open]);

  const handleClose = () => {
    setError(null);
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
        location = `${city}, ${regionData?.label || region}`;
      } else if (region) {
        const regionData = REGIONS.find(r => r.value === region);
        location = regionData?.label || region;
      } else if (city) {
        location = city;
      }

      // Nettoyer le nom
      let cleanName = name.trim();
      cleanName = cleanName.replace(/^(Select row|Select|Sélectionner)\s*/i, '');
      cleanName = cleanName.replace(/\s+/g, ' ').trim();

      const updatedContact: Contact = {
        name: cleanName,
        title: title.trim() || null,
        email: email.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        phone: phone.trim() || null,
        location: location || null,
        source: contact.source, // Garder la source originale
        confidence: contact.confidence, // Garder la confidence originale
      };

      await onSave(updatedContact, contactIndex);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer le contact "${contact.name}" ?`)) return;

    setDeleting(true);
    setError(null);

    try {
      await onDelete(contactIndex);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le contact</DialogTitle>
          <DialogDescription>
            Modifier les informations de {contact?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom (requis) */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nom complet *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
              required
            />
          </div>

          {/* Titre/Fonction */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Fonction</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sales Manager DACH, Export Director..."
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="j.dupont@company.com"
            />
          </div>

          {/* LinkedIn URL */}
          <div className="space-y-2">
            <Label htmlFor="edit-linkedin">Profil LinkedIn</Label>
            <Input
              id="edit-linkedin"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/jeandupont"
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Téléphone</Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+41 79 123 45 67"
            />
          </div>

          {/* Région */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-region">Région/Pays</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r.value || 'none'} value={r.value || 'none'}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-city">Ville</Label>
              <Input
                id="edit-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Zurich, Paris..."
              />
            </div>
          </div>

          {/* Source info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            Source: <strong>{contact?.source}</strong> • Confiance: {Math.round((contact?.confidence || 0) * 100)}%
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || deleting}
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading || deleting}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading || deleting}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
