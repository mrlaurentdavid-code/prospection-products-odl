"use client";

import { useState } from 'react';
import { Contact } from '@/lib/utils/validators';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmailComposer } from '@/components/EmailComposer';

interface ContactsListProps {
  contacts: Contact[];
  productName: string;
  productCategory: string | null;
  companyName: string;
  productId: string; // NOUVEAU: ID du produit
}

/**
 * Détermine le flag emoji depuis le code pays
 */
function getCountryFlag(location: string | null): string {
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
function getSourceBadgeVariant(source: Contact['source']): 'default' | 'secondary' | 'outline' {
  switch (source) {
    case 'claude_extraction':
      return 'secondary';
    case 'hunter_io':
      return 'default';
    case 'manual':
      return 'outline';
    default:
      return 'outline';
  }
}

/**
 * Composant pour afficher une liste de contacts
 */
export function ContactsList({ contacts, productName, productCategory, companyName, productId }: ContactsListProps) {
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setEmailComposerOpen(true);
  };

  if (!contacts || contacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">👥 Contacts décisionnaires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 text-5xl">🕵️</div>
            <p className="text-sm text-gray-600">
              Aucun contact trouvé pour ce produit
            </p>
            <p className="text-xs text-gray-500 mt-1">
              L'IA n'a pas pu extraire de contacts depuis le contenu
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          👥 Contacts décisionnaires
          <Badge variant="secondary">{contacts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {contacts.map((contact, index) => (
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

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleContactClick(contact)}
              >
                Contacter
              </Button>
            </div>
          </div>
        ))}
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
