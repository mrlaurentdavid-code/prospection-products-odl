"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { BrandEmailComposer } from './BrandEmailComposer';

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
  categories: string[];
}

export function BrandContactsSection({
  contacts,
  brandId,
  brandName,
  brandDescription,
  companyName,
  categories,
}: BrandContactsSectionProps) {
  const [selectedContact, setSelectedContact] = useState<BrandContact | null>(null);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);

  const handleContactClick = (contact: BrandContact) => {
    if (!contact.email) {
      alert('Aucun email disponible pour ce contact');
      return;
    }
    setSelectedContact(contact);
    setEmailComposerOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Contacts ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contacts.map((contact: BrandContact, idx: number) => (
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
                    <div className="flex items-center justify-between">
                      <p>
                        📧 <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleContactClick(contact)}
                        className="ml-2"
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Contacter
                      </Button>
                    </div>
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
                      Source: {contact.source === 'hunter_io' ? 'Hunter.io' : contact.source === 'claude_extraction' ? 'Claude AI' : contact.source}
                    </p>
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
    </>
  );
}
