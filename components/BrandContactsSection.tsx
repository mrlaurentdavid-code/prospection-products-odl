"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';
import { BrandEmailComposer } from './BrandEmailComposer';
import { AddContactModal } from '@/components/AddContactModal';
import { EditContactModal } from '@/components/EditContactModal';
import { LushaSearchModal } from '@/components/LushaSearchModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Contact } from '@/lib/utils/validators';

// Régions pour le filtre
const REGION_FILTERS = [
  { value: 'all', label: 'Toutes les régions' },
  { value: 'DACH', label: '🏔️ DACH (DE-AT-CH)' },
  { value: 'CH', label: '🇨🇭 Suisse' },
  { value: 'DE', label: '🇩🇪 Allemagne' },
  { value: 'AT', label: '🇦🇹 Autriche' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'EU', label: '🇪🇺 Europe' },
];

interface BrandContact {
  name?: string;
  email?: string;
  title?: string;
  location?: string;
  confidence?: number;
  phone?: string;
  linkedin_url?: string;
  source?: string;
}

interface BrandContactsSectionProps {
  contacts: BrandContact[];
  brandId: string;
  brandName: string;
  brandDescription: string | null;
  companyName: string;
  companyWebsite?: string | null;
  categories: string[];
  onContactsUpdate?: (contacts: BrandContact[]) => void;
}

/**
 * Filtre les contacts par région
 */
function filterContactsByRegion(contacts: BrandContact[], region: string): BrandContact[] {
  if (region === 'all') return contacts;

  const regionKeywords: Record<string, string[]> = {
    DACH: ['switzerland', 'schweiz', 'suisse', 'germany', 'deutschland', 'austria', 'österreich', 'dach', 'ch', 'de', 'at'],
    CH: ['switzerland', 'schweiz', 'suisse', 'zurich', 'zürich', 'geneva', 'genève', 'basel', 'bern', 'ch'],
    DE: ['germany', 'deutschland', 'berlin', 'munich', 'münchen', 'frankfurt', 'hamburg', 'de'],
    AT: ['austria', 'österreich', 'vienna', 'wien', 'salzburg', 'at'],
    FR: ['france', 'paris', 'lyon', 'marseille', 'fr'],
    EU: ['europe', 'eu', 'emea'],
  };

  const keywords = regionKeywords[region] || [];

  return contacts.filter((contact) => {
    const location = (contact.location || '').toLowerCase();
    const title = (contact.title || '').toLowerCase();
    return keywords.some((kw) => location.includes(kw) || title.includes(kw));
  });
}

export function BrandContactsSection({
  contacts,
  brandId,
  brandName,
  brandDescription,
  companyName,
  companyWebsite,
  categories,
  onContactsUpdate,
}: BrandContactsSectionProps) {
  const [selectedContact, setSelectedContact] = useState<BrandContact | null>(null);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [editContactIndex, setEditContactIndex] = useState<number>(-1);
  const [lushaModalOpen, setLushaModalOpen] = useState(false);
  const [regionFilter, setRegionFilter] = useState('all');
  const [isEnriching, setIsEnriching] = useState(false);

  // Extraire le domaine du site web
  const companyDomain = companyWebsite ? new URL(companyWebsite).hostname.replace('www.', '') : undefined;

  const handleContactClick = (contact: BrandContact) => {
    if (!contact.email) {
      alert('Aucun email disponible pour ce contact');
      return;
    }
    setSelectedContact(contact);
    setEmailComposerOpen(true);
  };

  // Ouvrir le modal d'édition
  const handleEditContact = (contact: BrandContact, index: number) => {
    setSelectedContact(contact);
    setEditContactIndex(index);
    setEditContactOpen(true);
  };

  // Ajouter un contact manuellement
  const handleAddContact = async (contact: Contact) => {
    const response = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'brand',
        entityId: brandId,
        contact,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Erreur lors de l\'ajout');
    }

    const data = await response.json();
    if (onContactsUpdate) {
      onContactsUpdate(data.contacts);
    }
  };

  // Mettre à jour un contact
  const handleSaveContact = async (contact: Contact, index: number) => {
    const response = await fetch('/api/contacts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'brand',
        entityId: brandId,
        contactIndex: index,
        contact,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Erreur lors de la mise à jour');
    }

    const data = await response.json();
    if (onContactsUpdate) {
      onContactsUpdate(data.contacts);
    }
  };

  // Supprimer un contact
  const handleDeleteContact = async (index: number) => {
    const response = await fetch(`/api/contacts?entityType=brand&entityId=${brandId}&contactIndex=${index}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Erreur lors de la suppression');
    }

    const data = await response.json();
    if (onContactsUpdate) {
      onContactsUpdate(data.contacts);
    }
  };

  // Re-enrichir les contacts via Hunter.io + scraping
  const handleReEnrich = async () => {
    setIsEnriching(true);
    try {
      const response = await fetch('/api/contacts/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'brand',
          entityId: brandId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'enrichissement');
      }

      const data = await response.json();
      if (onContactsUpdate) {
        onContactsUpdate(data.contacts);
      }
    } catch (error) {
      console.error('Erreur enrichissement:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'enrichissement');
    } finally {
      setIsEnriching(false);
    }
  };

  // Handler pour les contacts ajoutés via Lusha
  const handleLushaContactsAdded = (newContacts: any[]) => {
    if (onContactsUpdate && newContacts.length > 0) {
      onContactsUpdate([...contacts, ...newContacts]);
    }
  };

  // Filtrer les contacts par région
  const filteredContacts = filterContactsByRegion(contacts || [], regionFilter);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              Contacts
              <Badge variant="secondary">{filteredContacts.length}/{contacts.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtre par région */}
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[160px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGION_FILTERS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReEnrich}
                disabled={isEnriching}
              >
                {isEnriching ? '🔄' : '🔍'} Enrichir
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setLushaModalOpen(true)}
                title="Recherche avancée Lusha"
              >
                🔮 Lusha
              </Button>
              <Button size="sm" onClick={() => setAddContactOpen(true)}>
                + Ajouter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredContacts.length === 0 && contacts.length > 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                Aucun contact pour la région sélectionnée. <button className="text-blue-600 underline" onClick={() => setRegionFilter('all')}>Voir tous</button>
              </div>
            )}
            {filteredContacts.length === 0 && contacts.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <div className="text-4xl mb-2">🕵️</div>
                <p className="text-sm">Aucun contact trouvé</p>
                <p className="text-xs mt-1">Utilisez "Enrichir" ou ajoutez un contact manuellement</p>
              </div>
            )}
            {filteredContacts.map((contact: BrandContact, idx: number) => (
              <div key={idx} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    {contact.name && (
                      <p className="font-medium text-gray-900">{contact.name}</p>
                    )}
                    {contact.title && (
                      <p className="text-sm text-gray-600">{contact.title}</p>
                    )}
                    {!contact.name && !contact.title && (
                      <p className="font-medium text-gray-600">Contact {idx + 1}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.location && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {contact.location}
                      </span>
                    )}
                    {contact.confidence && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                        {Math.round(contact.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  {contact.email && (
                    <p>
                      📧 <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                        {contact.email}
                      </a>
                    </p>
                  )}
                  {contact.linkedin_url && (
                    <p>
                      💼 <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        LinkedIn
                      </a>
                    </p>
                  )}
                  {contact.phone && (
                    <p className="text-gray-600">📞 {contact.phone}</p>
                  )}
                  {contact.source && (
                    <p className="text-xs text-gray-500">
                      Source: {contact.source === 'hunter_io' ? 'Hunter.io' : contact.source === 'claude_extraction' ? 'Claude AI' : contact.source === 'lusha' ? 'Lusha' : contact.source === 'manual' ? 'Manuel' : contact.source}
                    </p>
                  )}
                </div>
                {/* Actions: Modifier + Contacter */}
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                    onClick={() => handleEditContact(contact, idx)}
                    title="Modifier"
                  >
                    ✏️
                  </Button>
                  {contact.email && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleContactClick(contact)}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Contacter
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email Composer Modal */}
      {selectedContact && (
        <BrandEmailComposer
          open={emailComposerOpen}
          onClose={() => {
            setEmailComposerOpen(false);
            setSelectedContact(null);
          }}
          contact={selectedContact}
          brandName={brandName}
          brandDescription={brandDescription}
          companyName={companyName}
          brandId={brandId}
          categories={categories}
        />
      )}

      {/* Modal d'ajout de contact */}
      <AddContactModal
        open={addContactOpen}
        onClose={() => setAddContactOpen(false)}
        onAdd={handleAddContact}
        entityType="brand"
        entityId={brandId}
        entityName={brandName}
      />

      {/* Modal d'édition de contact */}
      {selectedContact && editContactIndex >= 0 && (
        <EditContactModal
          open={editContactOpen}
          onClose={() => {
            setEditContactOpen(false);
            setEditContactIndex(-1);
          }}
          onSave={handleSaveContact}
          onDelete={handleDeleteContact}
          contact={selectedContact as Contact}
          contactIndex={editContactIndex}
        />
      )}

      {/* Modal de recherche Lusha */}
      <LushaSearchModal
        open={lushaModalOpen}
        onClose={() => setLushaModalOpen(false)}
        onContactsAdded={handleLushaContactsAdded}
        entityType="brand"
        entityId={brandId}
        companyName={companyName}
        companyDomain={companyDomain}
        brandName={brandName}
      />
    </>
  );
}
