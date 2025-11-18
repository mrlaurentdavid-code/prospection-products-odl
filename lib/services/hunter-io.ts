import { Contact } from '@/lib/utils/validators';

/**
 * Interface pour la réponse Hunter.io
 */
interface HunterEmail {
  value: string;
  type: string;
  confidence: number;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  linkedin: string | null;
  phone_number: string | null;
}

interface HunterDomainSearchResponse {
  data: {
    domain: string;
    emails: HunterEmail[];
  };
}

/**
 * Extrait le domaine depuis une URL
 * @param url - URL complète (ex: https://www.example.com/path)
 * @returns Domaine (ex: example.com)
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace('www.', '');
  }
}

/**
 * Extrait le domaine parent international (.com) depuis un domaine local
 * Exemples:
 * - segwayfrance.com → segway.com
 * - example.fr → example.com
 * - company.de → company.com
 */
function getParentDomain(domain: string): string | null {
  // Indicateurs de pays à retirer du nom de domaine
  const countryIndicators = [
    'france', 'deutschland', 'schweiz', 'suisse', 'svizzera',
    'italia', 'espana', 'nederland', 'belgique', 'osterreich',
    'polska', 'uk', 'usa', 'canada'
  ];

  // TLDs pays à remplacer par .com
  const countryTLDs = ['.fr', '.de', '.ch', '.it', '.es', '.nl', '.be', '.at', '.pl', '.uk', '.co.uk'];

  let baseDomain = domain.toLowerCase();

  // Retirer l'extension actuelle
  const parts = baseDomain.split('.');
  const extension = `.${parts[parts.length - 1]}`;
  const nameWithoutTLD = parts.slice(0, -1).join('.');

  // Stratégie 1: Retirer les indicateurs de pays du nom
  for (const indicator of countryIndicators) {
    if (nameWithoutTLD.includes(indicator)) {
      const cleanName = nameWithoutTLD.replace(indicator, '');
      if (cleanName.length > 0) {
        return `${cleanName}.com`;
      }
    }
  }

  // Stratégie 2: Si TLD pays, essayer .com
  if (countryTLDs.includes(extension) || countryTLDs.includes(`.${parts.slice(-2).join('.')}`)) {
    return `${nameWithoutTLD}.com`;
  }

  return null;
}

/**
 * Recherche les contacts d'une entreprise via Hunter.io
 *
 * Hunter.io Domain Search API:
 * - Plan gratuit: 50 recherches/mois
 * - Retourne emails + LinkedIn profiles
 * - Confidence score pour chaque email
 * - Fallback automatique sur domaine parent si domaine local sans résultat
 * - Support société mère (ex: Womanizer → WOW Tech Group)
 *
 * @param companyWebsite - URL du site web de l'entreprise
 * @param parentCompany - Nom de la société mère (optionnel)
 * @param limit - Nombre max de contacts à retourner (défaut: 5)
 * @returns Array de contacts enrichis
 */
export async function findCompanyContacts(
  companyWebsite: string,
  parentCompany?: string | null,
  limit: number = 5
): Promise<Contact[]> {
  // Vérifier que la clé API est configurée
  if (!process.env.HUNTER_API_KEY) {
    console.warn('⚠️ HUNTER_API_KEY not configured, skipping Hunter.io enrichment');
    return [];
  }

  try {
    const domain = extractDomain(companyWebsite);
    const apiKey = process.env.HUNTER_API_KEY;

    // Tentative 1: Domaine original
    console.log(`🔍 Hunter.io: Searching for ${domain}...`);
    let url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}&limit=${limit}`;
    let response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Hunter.io API error: ${response.status} ${response.statusText}`);
    }

    let data: HunterDomainSearchResponse = await response.json();

    // Si aucun résultat, essayer le domaine parent
    if (data.data.emails.length === 0) {
      const parentDomain = getParentDomain(domain);

      if (parentDomain && parentDomain !== domain) {
        console.log(`ℹ️ Hunter.io: No results for ${domain}, trying parent domain ${parentDomain}...`);

        url = `https://api.hunter.io/v2/domain-search?domain=${parentDomain}&api_key=${apiKey}&limit=${limit}`;
        response = await fetch(url);

        if (response.ok) {
          const parentData: HunterDomainSearchResponse = await response.json();

          if (parentData.data.emails.length > 0) {
            console.log(`✅ Hunter.io: Found ${parentData.data.emails.length} contacts on parent domain ${parentDomain}`);
            data = parentData;
          } else {
            console.log(`ℹ️ Hunter.io: No contacts found on parent domain either`);
          }
        }
      } else {
        console.log(`ℹ️ Hunter.io: No parent domain to try for ${domain}`);
      }
    }

    // Si toujours aucun résultat et qu'une société mère est fournie, essayer son domaine
    if (data.data.emails.length === 0 && parentCompany) {
      // Essayer de construire le domaine de la société mère
      // Ex: "WOW Tech Group" → "wowtechgroup.com"
      const parentCompanyDomain = parentCompany
        .toLowerCase()
        .replace(/\s+/g, '') // Retirer les espaces
        .replace(/[^a-z0-9]/g, '') // Retirer les caractères spéciaux
        .concat('.com');

      if (parentCompanyDomain !== domain) {
        console.log(`ℹ️ Hunter.io: No results on brand domain, trying parent company domain ${parentCompanyDomain}...`);

        url = `https://api.hunter.io/v2/domain-search?domain=${parentCompanyDomain}&api_key=${apiKey}&limit=${limit}`;
        response = await fetch(url);

        if (response.ok) {
          const parentCompanyData: HunterDomainSearchResponse = await response.json();

          if (parentCompanyData.data.emails.length > 0) {
            console.log(`✅ Hunter.io: Found ${parentCompanyData.data.emails.length} contacts on parent company domain ${parentCompanyDomain}`);
            data = parentCompanyData;
          } else {
            console.log(`ℹ️ Hunter.io: No contacts found on parent company domain either`);
          }
        }
      }
    }

    // Mots-clés prioritaires pour marchés Suisse/Européen (score +2)
    const swissEuropeKeywords = [
      'switzerland',
      'swiss',
      'suisse',
      'schweiz',
      'europe',
      'european',
      'eu',
      'export',
      'international',
      'dach', // Germany, Austria, Switzerland
      'emea', // Europe, Middle East, Africa
    ];

    // Mots-clés pertinents pour ventes/business (score +1)
    const relevantTitles = [
      'sales',
      'business development',
      'commercial',
      'account manager',
      'key account',
      'director',
      'manager',
      'ceo',
      'founder',
      'vp',
      'head of',
    ];

    // Calculer un score de pertinence pour chaque contact
    const scoredContacts = data.data.emails
      .filter((email) => {
        const position = email.position?.toLowerCase() || '';
        // Au moins un titre pertinent requis
        return relevantTitles.some((title) => position.includes(title));
      })
      .map((email) => {
        const position = email.position?.toLowerCase() || '';
        let score = 0;

        // Bonus pour mots-clés Suisse/Europe
        swissEuropeKeywords.forEach((keyword) => {
          if (position.includes(keyword)) {
            score += 2;
          }
        });

        // Bonus pour titres pertinents
        relevantTitles.forEach((title) => {
          if (position.includes(title)) {
            score += 1;
          }
        });

        return {
          contact: {
            name: `${email.first_name} ${email.last_name}`,
            title: email.position || null,
            email: email.value,
            linkedin_url: email.linkedin || null,
            location: null, // Hunter.io ne retourne pas la localisation dans Domain Search
            phone: email.phone_number || null,
            source: 'hunter_io' as const,
            confidence: email.confidence / 100, // Hunter retourne 0-100, on normalise à 0-1
          },
          score,
        };
      })
      // Trier par score décroissant (priorité Suisse/Europe)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.contact);

    console.log(`✅ Hunter.io found ${scoredContacts.length} contacts for ${domain} (prioritized Swiss/EU)`);
    return scoredContacts;
  } catch (error) {
    console.error('Hunter.io error:', error);
    // Ne pas faire échouer le workflow si Hunter.io échoue
    return [];
  }
}

/**
 * Merge les contacts Claude + Hunter.io en évitant les doublons
 * Priorise les contacts responsables des marchés Suisse/Européen
 *
 * @param claudeContacts - Contacts extraits par Claude
 * @param hunterContacts - Contacts trouvés par Hunter.io
 * @returns Array de contacts mergés et dédupliqués
 */
export function mergeContacts(claudeContacts: Contact[], hunterContacts: Contact[]): Contact[] {
  const allContacts = [...claudeContacts, ...hunterContacts];

  // Déduplication par email (si disponible) ou par nom
  const uniqueContacts = allContacts.reduce((acc: Contact[], contact) => {
    const isDuplicate = acc.some(
      (c) =>
        (contact.email && c.email && c.email.toLowerCase() === contact.email.toLowerCase()) ||
        (contact.name && c.name && c.name.toLowerCase() === contact.name.toLowerCase())
    );

    if (!isDuplicate) {
      acc.push(contact);
    }

    return acc;
  }, []);

  // Mots-clés prioritaires Suisse/Europe
  const swissEuropeKeywords = [
    'switzerland',
    'swiss',
    'suisse',
    'schweiz',
    'europe',
    'european',
    'eu',
    'export',
    'international',
    'dach',
    'emea',
  ];

  // Calculer un score combiné (confidence + priorité Suisse/EU)
  const scoredContacts = uniqueContacts.map((contact) => {
    let score = contact.confidence || 0.5;
    const title = contact.title?.toLowerCase() || '';
    const location = contact.location?.toLowerCase() || '';

    // Bonus +0.3 si le titre contient un mot-clé Suisse/Europe
    if (swissEuropeKeywords.some((keyword) => title.includes(keyword))) {
      score += 0.3;
    }

    // Bonus +0.2 si la localisation est en Suisse/Europe
    if (
      location.includes('ch') ||
      location.includes('switzerland') ||
      location.includes('suisse') ||
      location.includes('france') ||
      location.includes('germany') ||
      location.includes('europe')
    ) {
      score += 0.2;
    }

    return { contact, score };
  });

  // Trier par score décroissant (priorité Suisse/Europe + confidence)
  return scoredContacts
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Max 5 contacts
    .map((item) => item.contact);
}
