"use client";

import { useState } from 'react';
import { Contact } from '@/lib/utils/validators';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmailComposer } from '@/components/EmailComposer';
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

interface ContactsListProps {
  contacts: Contact[];
  productName: string;
  productCategory: string | null;
  companyName: string;
  productId: string;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  onContactsUpdate?: (contacts: Contact[]) => void; // Callback pour mise à jour
}

/**
 * Détermine le flag emoji depuis le code pays
 */
function getCountryFlag(location: string | null | undefined): string {
  if (!location) return '🌍';

  const countryFlags: Record<string, string> = {
    france: '🇫🇷',
    germany: '🇩🇪',
    switzerland: '🇨🇭',
    italy: '🇮🇹',
    spain: '🇪🇸',
    netherlands: '🇳🇱',
    belgium: '🇧🇪',
    austria: '🇦🇹',
    poland: '🇵🇱',
    uk: '🇬🇧',
    'united kingdom': '🇬🇧',
  };

  const locationLower = location.toLowerCase();
  for (const [country, flag] of Object.entries(countryFlags)) {
    if (locationLower.includes(country)) {
      return flag;
    }
  }

  return '🌍';
}

/**
 * Détermine la couleur du badge selon la source
 */
function getSourceBadgeVariant(source: Contact['source']): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (source) {
    case 'claude_extraction':
      return 'secondary';
    case 'hunter_io':
      return 'default';
    case 'lusha':
      return 'destructive'; // Violet/rose pour Lusha (premium)
    case 'manual':
      return 'outline';
    default:
      return 'outline';
  }
}

/**
 * Filtre les contacts par région
 */
function filterContactsByRegion(contacts: Contact[], region: string): Contact[] {
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

/**
 * Composant pour afficher une liste de contacts
 */
export function ContactsList({ contacts, productName, productCategory, companyName, productId, companyEmail, companyWebsite, onContactsUpdate }: ContactsListProps) {
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [editContactIndex, setEditContactIndex] = useState<number>(-1);
  const [regionFilter, setRegionFilter] = useState('all');
  const [isEnriching, setIsEnriching] = useState(false);
  const [lushaModalOpen, setLushaModalOpen] = useState(false);

  // Extraire le domaine du site web
  const companyDomain = companyWebsite ? (() => {
    try {
      return new URL(companyWebsite).hostname.replace('www.', '');
    } catch {
      return undefined;
    }
  })() : undefined;

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setEmailComposerOpen(true);
  };

  // Ouvrir le modal d'édition
  const handleEditContact = (contact: Contact, index: number) => {
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
        entityType: 'product',
        entityId: productId,
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
        entityType: 'product',
        entityId: productId,
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
    const response = await fetch(`/api/contacts?entityType=product&entityId=${productId}&contactIndex=${index}`, {
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
          entityType: 'product',
          entityId: productId,
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

  // Handler pour les contacts ajoutés via Lusha modal
  const handleLushaContactsAdded = (newContacts: Contact[]) => {
    if (onContactsUpdate && newContacts.length > 0) {
      onContactsUpdate([...contacts, ...newContacts]);
    }
  };

  // Filtrer les contacts par région
  const filteredContacts = filterContactsByRegion(contacts || [], regionFilter);

  // Si aucun contact personnel mais email générique disponible, créer un contact générique
  if (!contacts || contacts.length === 0) {
    if (companyEmail) {
      // Créer un contact générique avec l'email de l'entreprise
      const genericContact: Contact = {
        name: companyName,
        title: 'Contact général',
        email: companyEmail,
        linkedin_url: null,
        location: null,
        phone: null,
        source: 'claude_extraction',
        confidence: 0.5, // Confidence plus basse pour email générique
      };

      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              👥 Contact entreprise
              <Badge variant="outline" className="text-xs">Email générique</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              {/* Header: Nom entreprise */}
              <div className="mb-3">
                <h4 className="font-semibold text-gray-900">{companyName}</h4>
                <p className="text-sm text-gray-600">Contact général</p>
              </div>

              {/* Infos contact */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">📧</span>
                  <a
                    href={`mailto:${companyEmail}`}
                    className="text-blue-600 hover:underline"
                  >
                    {companyEmail}
                  </a>
                </div>

                {companyWebsite && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">🌐</span>
                    <a
                      href={companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Site web
                    </a>
                  </div>
                )}
              </div>

              {/* Footer: Note + Action */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  ℹ️ Email générique (info@, contact@, sales@)
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleContactClick(genericContact)}
                >
                  Contacter
                </Button>
              </div>
            </div>
          </CardContent>

          {/* Modal de composition d'email */}
          {selectedContact && (
            <EmailComposer
              open={emailComposerOpen}
              onClose={() => setEmailComposerOpen(false)}
              contact={selectedContact}
              productName={productName}
              productCategory={productCategory}
              companyName={companyName}
              productId={productId}
            />
          )}
        </Card>
      );
    }

    // Aucun contact ni email générique
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">👥 Contacts décisionnaires</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReEnrich}
                  disabled={isEnriching}
                >
                  {isEnriching ? '🔄 Recherche...' : '🔍 Rechercher'}
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 text-5xl">🕵️</div>
              <p className="text-sm text-gray-600">
                Aucun contact trouvé pour ce produit
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Utilisez "Rechercher" pour lancer une recherche automatique ou ajoutez un contact manuellement
              </p>
            </div>
          </CardContent>
        </Card>

        <AddContactModal
          open={addContactOpen}
          onClose={() => setAddContactOpen(false)}
          onAdd={handleAddContact}
          entityType="product"
          entityId={productId}
          entityName={productName}
        />

        {/* Modal de recherche Lusha */}
        <LushaSearchModal
          open={lushaModalOpen}
          onClose={() => setLushaModalOpen(false)}
          onContactsAdded={handleLushaContactsAdded}
          entityType="product"
          entityId={productId}
          companyName={companyName}
          companyDomain={companyDomain}
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              👥 Contacts décisionnaires
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
        <CardContent className="space-y-4">
          {filteredContacts.length === 0 && contacts.length > 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              Aucun contact pour la région sélectionnée. <button className="text-blue-600 underline" onClick={() => setRegionFilter('all')}>Voir tous</button>
            </div>
          )}
          {filteredContacts.map((contact, index) => (
          <div
            key={index}
            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            {/* Header: Nom + Flag */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getCountryFlag(contact.location)}</span>
                <div>
                  <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                  {contact.title && (
                    <p className="text-sm text-gray-600">{contact.title}</p>
                  )}
                </div>
              </div>
              <Badge variant={getSourceBadgeVariant(contact.source)} className="text-xs">
                {contact.source === 'claude_extraction' && 'IA'}
                {contact.source === 'hunter_io' && 'Hunter.io'}
                {contact.source === 'lusha' && 'Lusha'}
                {contact.source === 'manual' && 'Manuel'}
              </Badge>
            </div>

            {/* Infos contact */}
            <div className="space-y-1.5 mb-3">
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">📧</span>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {contact.email}
                  </a>
                </div>
              )}

              {contact.linkedin_url && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">🔗</span>
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    LinkedIn Profile
                  </a>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">📞</span>
                  <a href={`tel:${contact.phone}`} className="text-gray-700">
                    {contact.phone}
                  </a>
                </div>
              )}

              {contact.location && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">📍</span>
                  <span className="text-gray-700">{contact.location}</span>
                </div>
              )}
            </div>

            {/* Footer: Confidence + Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>⭐</span>
                <span>
                  Confiance: {Math.round((contact.confidence || 0) * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                  onClick={() => handleEditContact(contact, index)}
                  title="Modifier"
                >
                  ✏️
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleContactClick(contact)}
                >
                  Contacter
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>

      </Card>

      {/* Modal de composition d'email */}
      {selectedContact && (
        <EmailComposer
          open={emailComposerOpen}
          onClose={() => setEmailComposerOpen(false)}
          contact={selectedContact}
          productName={productName}
          productCategory={productCategory}
          companyName={companyName}
          productId={productId}
        />
      )}

      {/* Modal d'ajout de contact */}
      <AddContactModal
        open={addContactOpen}
        onClose={() => setAddContactOpen(false)}
        onAdd={handleAddContact}
        entityType="product"
        entityId={productId}
        entityName={productName}
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
          contact={selectedContact}
          contactIndex={editContactIndex}
        />
      )}

      {/* Modal de recherche Lusha */}
      <LushaSearchModal
        open={lushaModalOpen}
        onClose={() => setLushaModalOpen(false)}
        onContactsAdded={handleLushaContactsAdded}
        entityType="product"
        entityId={productId}
        companyName={companyName}
        companyDomain={companyDomain}
      />
    </>
  );
}
