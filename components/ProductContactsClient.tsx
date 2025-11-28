"use client";

import { useState } from 'react';
import { ContactsList } from './ContactsList';
import { Contact } from '@/lib/utils/validators';

interface ProductContactsClientProps {
  productId: string;
  productName: string;
  productCategory: string | null;
  companyName: string;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  initialContacts: Contact[];
}

export function ProductContactsClient({
  productId,
  productName,
  productCategory,
  companyName,
  companyEmail,
  companyWebsite,
  initialContacts,
}: ProductContactsClientProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);

  const handleContactsUpdate = (newContacts: Contact[]) => {
    setContacts(newContacts);
  };

  return (
    <ContactsList
      contacts={contacts}
      productName={productName}
      productCategory={productCategory}
      companyName={companyName}
      productId={productId}
      companyEmail={companyEmail}
      companyWebsite={companyWebsite}
      onContactsUpdate={handleContactsUpdate}
    />
  );
}
