"use client";

import { useState } from 'react';
import { BrandContactsSection } from './BrandContactsSection';

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

interface BrandDetailClientProps {
  brandId: string;
  brandName: string;
  brandDescription: string | null;
  companyName: string;
  categories: string[];
  initialContacts: BrandContact[];
}

export function BrandDetailClient({
  brandId,
  brandName,
  brandDescription,
  companyName,
  categories,
  initialContacts,
}: BrandDetailClientProps) {
  const [contacts, setContacts] = useState<BrandContact[]>(initialContacts);

  const handleContactsUpdate = (newContacts: BrandContact[]) => {
    setContacts(newContacts);
  };

  return (
    <BrandContactsSection
      contacts={contacts}
      brandId={brandId}
      brandName={brandName}
      brandDescription={brandDescription}
      companyName={companyName}
      categories={categories}
      onContactsUpdate={handleContactsUpdate}
    />
  );
}
