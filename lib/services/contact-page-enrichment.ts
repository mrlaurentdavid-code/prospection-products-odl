/**
 * Contact Page Enrichment Service
 *
 * Scrape automatiquement les pages de contact/B2B d'un site web
 * pour enrichir les données de contacts.
 */

import { Contact } from '@/lib/utils/validators';

/**
 * URLs typiques de pages de contact à essayer
 */
const CONTACT_PAGE_PATTERNS = [
  '/contact',
  '/kontakt',
  '/contact-us',
  '/kontaktinfos',
  '/b2b',
  '/business',
  '/wholesale',
  '/partner',
  '/about',
  '/about-us',
  '/ueber-uns',
  '/impressum',
];

/**
 * Extrait le domaine racine depuis une URL
 */
function extractRootDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch {
    return null;
  }
}

/**
 * Cherche des informations de contact dans un contenu HTML/text
 */
function extractContactsFromContent(content: string, websiteUrl: string): Contact[] {
  const contacts: Contact[] = [];

  // Pattern pour email B2B/commercial (plus spécifique, inclut info@)
  const b2bEmailPattern = /(order|sales|business|b2b|wholesale|partner|export|international|info|contact)@[\w\.-]+\.[a-z]{2,}/gi;
  const b2bEmails = content.match(b2bEmailPattern) || [];

  // Pattern pour téléphone (plus strict - doit commencer par +)
  const phonePattern = /(\+\d{1,3}[\s.-]?\d{1,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4})/g;
  const phoneMatches = content.match(phonePattern) || [];

  // Filtrer les faux positifs (timestamps, etc.)
  const phones = phoneMatches.filter(phone => {
    const digitsOnly = phone.replace(/\D/g, '');
    // Un vrai téléphone a entre 7 et 15 chiffres
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  });

  // Chercher des noms avec titres professionnels
  const titlePattern = /(Sales Manager|Business Development|Export Manager|Account Manager|Key Account|Director of Sales|VP Sales|Commercial Director|Gesch\u00e4ftsf\u00fchrer|Leiter Vertrieb)[\s:]+([A-Z][a-z]+\s[A-Z][a-z]+)/gi;
  const titleMatches = Array.from(content.matchAll(new RegExp(titlePattern)));

  // Créer des contacts depuis les emails B2B
  if (b2bEmails.length > 0) {
    // Dédupliquer les emails
    const uniqueEmails = Array.from(new Set(b2bEmails.map(e => e.toLowerCase())));

    uniqueEmails.forEach((email) => {
      // Déterminer le type de contact basé sur l'email
      let title = 'B2B Contact';
      if (email.includes('order')) title = 'Order & Sales Contact';
      else if (email.includes('sales')) title = 'Sales Contact';
      else if (email.includes('export') || email.includes('international')) title = 'Export & International Contact';
      else if (email.includes('info')) title = 'General Contact';
      else if (email.includes('business') || email.includes('b2b')) title = 'Business Development Contact';

      contacts.push({
        name: null,
        title,
        email,
        linkedin_url: null,
        location: null,
        phone: phones[0] || null, // Prendre le premier téléphone valide trouvé
        source: 'claude_extraction',
        confidence: 0.75,
      });
    });
  }

  // Ajouter les contacts avec titres
  titleMatches.forEach((match) => {
    const title = match[1];
    const name = match[2];

    contacts.push({
      name,
      title,
      email: null,
      linkedin_url: null,
      location: null,
      phone: null,
      source: 'claude_extraction',
      confidence: 0.8,
    });
  });

  return contacts;
}

/**
 * Tente de scraper les pages de contact d'un site web pour enrichir les contacts
 *
 * @param websiteUrl - URL du site web de l'entreprise
 * @returns Array de contacts enrichis
 */
export async function enrichContactsFromWebsite(websiteUrl: string): Promise<Contact[]> {
  const rootDomain = extractRootDomain(websiteUrl);
  if (!rootDomain) {
    console.warn('⚠️ Invalid website URL:', websiteUrl);
    return [];
  }

  console.log(`🔍 Enriching contacts from website: ${rootDomain}`);

  const allContacts: Contact[] = [];

  // Essayer chaque pattern de page de contact
  for (const pattern of CONTACT_PAGE_PATTERNS) {
    const contactPageUrl = `${rootDomain}${pattern}`;

    try {
      console.log(`  → Trying: ${contactPageUrl}`);

      // Scraper avec Jina AI Reader
      const jinaUrl = `https://r.jina.ai/${contactPageUrl}`;
      const response = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/plain',
        },
      });

      if (!response.ok) {
        continue; // Page not found, essayer le suivant
      }

      const content = await response.text();

      // Vérifier que la page contient bien du contenu de contact
      const hasContactInfo =
        content.includes('@') ||
        content.includes('contact') ||
        content.includes('email') ||
        content.includes('phone') ||
        content.includes('b2b') ||
        content.includes('sales') ||
        content.includes('business');

      if (!hasContactInfo) {
        continue; // Pas d'info de contact, essayer la suivante
      }

      console.log(`  ✅ Found contact page: ${contactPageUrl}`);

      // Extraire les contacts
      const contacts = extractContactsFromContent(content, websiteUrl);

      if (contacts.length > 0) {
        console.log(`  📇 Extracted ${contacts.length} contacts from ${pattern}`);
        allContacts.push(...contacts);
      }

      // Arrêter après la première page de contact trouvée avec des contacts
      if (allContacts.length > 0) {
        break;
      }

    } catch (error) {
      console.log(`  ✗ Failed to scrape ${pattern}:`, error);
      continue;
    }
  }

  // Dédupliquer par email
  const uniqueContacts = allContacts.reduce((acc: Contact[], contact) => {
    if (contact.email) {
      const exists = acc.some(c => c.email?.toLowerCase() === contact.email?.toLowerCase());
      if (!exists) {
        acc.push(contact);
      }
    } else {
      acc.push(contact);
    }
    return acc;
  }, []);

  console.log(`✅ Total enriched contacts: ${uniqueContacts.length}`);

  return uniqueContacts.slice(0, 5); // Max 5 contacts
}
