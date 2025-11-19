/**
 * Contact Page Enrichment Service
 *
 * Scrape automatiquement les pages de contact/B2B d'un site web
 * pour enrichir les données de contacts.
 */

import { Contact } from '@/lib/utils/validators';

/**
 * URLs typiques de pages de contact à essayer
 * PRIORITÉ: Pages régionales Suisse/Europe en premier
 */
const CONTACT_PAGE_PATTERNS = [
  // Pages régionales Suisse/Europe (PRIORITÉ)
  '/contact-switzerland',
  '/contact-swiss',
  '/kontakt-schweiz',
  '/switzerland',
  '/schweiz',
  '/suisse',
  '/ch',
  '/de-ch', // Allemand Suisse
  '/fr-ch', // Français Suisse
  '/it-ch', // Italien Suisse
  '/contact-europe',
  '/europe',
  '/eu',
  '/dach', // Germany, Austria, Switzerland
  '/de-de', // Allemagne
  '/fr-fr', // France
  '/locations',
  '/standorte', // Locations en allemand
  '/offices',
  '/distributors',
  '/vertrieb', // Sales en allemand

  // Pages générales de contact (SECONDAIRE)
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
 * Détecte si c'est un sous-domaine de langue/région (fr-fr, de-de, en-us, etc.)
 * et retourne le domaine principal
 */
function getNormalizedDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Pattern pour sous-domaines langue/région: fr-fr, de-de, en-us, fr-ch, etc.
    const langRegionPattern = /^([a-z]{2}-[a-z]{2})\./i;
    const match = hostname.match(langRegionPattern);

    if (match) {
      // Retirer le sous-domaine langue/région pour obtenir le domaine principal
      const mainDomain = hostname.replace(langRegionPattern, '');
      console.log(`  🌍 Detected language subdomain: ${hostname} → normalized to: ${mainDomain}`);
      return `${urlObj.protocol}//${mainDomain}`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Cherche des informations de contact dans un contenu HTML/text
 */
function extractContactsFromContent(content: string, websiteUrl: string): Contact[] {
  const contacts: Contact[] = [];

  // Pattern pour email B2B/commercial (PRIORITÉ: Swiss/EU spécifique)
  const swissEuEmailPattern = /(switzerland|swiss|schweiz|suisse|europe|eu|dach|export|international)@[\w\.-]+\.[a-z]{2,}/gi;
  const swissEuEmails = content.match(swissEuEmailPattern) || [];

  // Pattern pour email B2B général (plus spécifique, inclut info@)
  const b2bEmailPattern = /(order|sales|business|b2b|wholesale|partner|info|contact|vertrieb)@[\w\.-]+\.[a-z]{2,}/gi;
  const b2bEmails = content.match(b2bEmailPattern) || [];

  // Combiner les deux (Swiss/EU en premier)
  const allEmails = [...swissEuEmails, ...b2bEmails];

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
  if (allEmails.length > 0) {
    // Dédupliquer les emails
    const uniqueEmails = Array.from(new Set(allEmails.map(e => e.toLowerCase())));

    uniqueEmails.forEach((email) => {
      // Déterminer le type de contact basé sur l'email
      let title = 'B2B Contact';
      let confidence = 0.75;
      let location = null;

      // PRIORITÉ: Contacts Swiss/EU (confidence boost)
      if (email.includes('switzerland') || email.includes('swiss') || email.includes('schweiz') || email.includes('suisse')) {
        title = 'Switzerland Contact';
        location = 'Switzerland';
        confidence = 0.95; // Très haute priorité
      } else if (email.includes('europe') || email.includes('eu')) {
        title = 'Europe Contact';
        location = 'Europe';
        confidence = 0.90; // Haute priorité
      } else if (email.includes('dach')) {
        title = 'DACH Region Contact';
        location = 'DACH';
        confidence = 0.90;
      } else if (email.includes('export') || email.includes('international')) {
        title = 'Export & International Contact';
        confidence = 0.85;
      } else if (email.includes('order')) {
        title = 'Order & Sales Contact';
      } else if (email.includes('sales') || email.includes('vertrieb')) {
        title = 'Sales Contact';
      } else if (email.includes('info')) {
        title = 'General Contact';
        confidence = 0.65; // Moins prioritaire
      } else if (email.includes('business') || email.includes('b2b')) {
        title = 'Business Development Contact';
      }

      contacts.push({
        name: null,
        title,
        email,
        linkedin_url: null,
        location,
        phone: phones[0] || null, // Prendre le premier téléphone valide trouvé
        source: 'claude_extraction',
        confidence,
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

  // Détecter si on a un sous-domaine de langue (fr-fr, de-de, etc.)
  const normalizedDomain = getNormalizedDomain(websiteUrl);

  console.log(`🔍 Enriching contacts from website: ${rootDomain}`);
  if (normalizedDomain) {
    console.log(`  ℹ️ Will also try normalized domain: ${normalizedDomain}`);
  }

  const allContacts: Contact[] = [];

  // Domaines à essayer (original + normalisé si applicable)
  const domainsToTry = [rootDomain];
  if (normalizedDomain && normalizedDomain !== rootDomain) {
    domainsToTry.push(normalizedDomain);
  }

  // Essayer chaque pattern de page de contact (max 3 pour éviter les timeouts)
  let pagesChecked = 0;
  const MAX_PAGES_TO_CHECK = 3;

  // Boucle sur les domaines (original + normalisé)
  for (const domain of domainsToTry) {
    if (allContacts.length > 0) {
      // Arrêter si on a déjà trouvé des contacts
      break;
    }

    for (const pattern of CONTACT_PAGE_PATTERNS) {
      if (pagesChecked >= MAX_PAGES_TO_CHECK) {
        console.log(`  ⏭️ Skipping remaining patterns (checked ${MAX_PAGES_TO_CHECK} pages)`);
        break;
      }

      const contactPageUrl = `${domain}${pattern}`;

      try {
        console.log(`  → Trying: ${contactPageUrl}`);
        pagesChecked++;

        // Scraper avec Jina AI Reader avec timeout de 10s
        const jinaUrl = `https://r.jina.ai/${contactPageUrl}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(jinaUrl, {
          headers: {
            'Accept': 'text/plain',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

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
          // Arrêter dès qu'on trouve des contacts
          break;
        }

      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log(`  ⏱️ Timeout scraping ${pattern}`);
        } else {
          console.log(`  ✗ Failed to scrape ${pattern}`);
        }
        continue;
      }
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
