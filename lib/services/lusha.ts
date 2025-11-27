/**
 * Lusha API Service
 *
 * Recherche de contacts qualifiés via l'API Lusha Prospecting.
 * Focus sur les régions DACH/Europe et les rôles Sales/Business Development.
 *
 * Documentation: https://docs.lusha.com/apis/openapi/contact-search-and-enrich
 */

import { Contact } from '@/lib/utils/validators';

const LUSHA_API_BASE = 'https://api.lusha.com';

/**
 * Codes de séniorité Lusha
 * Source: https://docs.lusha.com/apis/openapi/contact-filters
 */
const SENIORITY_LEVELS = {
  ENTRY: '1',
  SENIOR: '2',
  MANAGER: '3',
  DIRECTOR: '4',
  VP: '5',
  C_LEVEL: '6',
  OWNER: '7',
};

/**
 * Départements Lusha pertinents pour la prospection B2B
 */
const SALES_DEPARTMENTS = [
  'sales',
  'business_development',
  'marketing',
  'management',
  'executive',
];

/**
 * Codes pays DACH et Europe pour les filtres Lusha
 */
const DACH_COUNTRIES = ['CH', 'DE', 'AT'];
const EU_COUNTRIES = ['CH', 'DE', 'AT', 'FR', 'NL', 'BE', 'IT', 'ES', 'UK', 'PL', 'SE', 'DK', 'NO', 'FI'];

/**
 * Titres de postes à cibler pour la prospection
 */
const TARGET_JOB_TITLES = [
  'Sales Manager',
  'Business Development',
  'Export Manager',
  'Country Manager',
  'Regional Manager',
  'Key Account Manager',
  'Commercial Director',
  'Sales Director',
  'Managing Director',
  'General Manager',
  'VP Sales',
  'Head of Sales',
  'Partner Manager',
  'Area Manager',
];

interface LushaContact {
  firstName: string;
  lastName: string;
  fullName: string;
  emailAddresses?: Array<{
    email: string;
    type: string;
  }>;
  phoneNumbers?: Array<{
    number: string;
    type: string;
  }>;
  positions?: Array<{
    title: string;
    companyName: string;
    isCurrent: boolean;
  }>;
  socialNetworks?: Array<{
    url: string;
    type: string;
  }>;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    countryCode?: string;
  };
}

interface LushaProspectingResponse {
  contacts: LushaContact[];
  totalResults: number;
  hasMore: boolean;
}

interface LushaSearchOptions {
  companyDomain: string;
  companyName?: string;
  focusRegion?: 'DACH' | 'EU' | 'ALL';
  focusDepartments?: string[];
  seniorityLevels?: string[];
  jobTitleKeywords?: string[];
  limit?: number;
}

/**
 * Vérifie si l'API Lusha est configurée
 */
export function isLushaConfigured(): boolean {
  return !!process.env.LUSHA_API_KEY;
}

/**
 * Score un contact Lusha selon sa pertinence pour la prospection DACH
 * Plus le score est haut, plus le contact est qualifié
 */
function scoreLushaContact(contact: LushaContact, focusRegion: 'DACH' | 'EU' | 'ALL'): number {
  let score = 0;
  const title = contact.positions?.find(p => p.isCurrent)?.title?.toLowerCase() || '';
  const countryCode = contact.location?.countryCode?.toUpperCase();

  // Score par pays (priorité DACH)
  if (countryCode === 'CH') score += 100; // Suisse = top priorité
  else if (countryCode === 'DE') score += 80; // Allemagne
  else if (countryCode === 'AT') score += 70; // Autriche
  else if (focusRegion === 'EU' && EU_COUNTRIES.includes(countryCode || '')) score += 50;

  // Score par titre (mots-clés prioritaires)
  if (title.includes('dach') || title.includes('switzerland') || title.includes('suisse') || title.includes('schweiz')) score += 50;
  if (title.includes('export')) score += 40;
  if (title.includes('country manager') || title.includes('regional manager')) score += 35;
  if (title.includes('sales director') || title.includes('commercial director')) score += 30;
  if (title.includes('business development')) score += 25;
  if (title.includes('sales manager') || title.includes('key account')) score += 20;
  if (title.includes('managing director') || title.includes('general manager')) score += 15;

  // Bonus si téléphone disponible
  if (contact.phoneNumbers && contact.phoneNumbers.length > 0) score += 30;

  // Bonus si email professionnel disponible
  if (contact.emailAddresses?.some(e => e.type === 'work')) score += 20;

  // Bonus si LinkedIn disponible
  if (contact.socialNetworks?.some(s => s.type === 'linkedin')) score += 10;

  return score;
}

/**
 * Recherche des contacts qualifiés via Lusha Prospecting API
 * OPTIMISÉ POUR 1 CRÉDIT: retourne uniquement le contact le plus qualifié
 * Focus sur les régions DACH/Europe et les rôles Sales/Business Development.
 *
 * @param options - Options de recherche
 * @returns Liste de contacts qualifiés (max 1 par défaut pour économiser les crédits)
 */
export async function searchLushaContacts(options: LushaSearchOptions): Promise<Contact[]> {
  const apiKey = process.env.LUSHA_API_KEY;

  if (!apiKey) {
    console.log('⚠️ LUSHA_API_KEY not configured, skipping Lusha search');
    return [];
  }

  const {
    companyDomain,
    companyName,
    focusRegion = 'DACH',
    focusDepartments = SALES_DEPARTMENTS,
    seniorityLevels = [SENIORITY_LEVELS.MANAGER, SENIORITY_LEVELS.DIRECTOR, SENIORITY_LEVELS.VP, SENIORITY_LEVELS.C_LEVEL],
    jobTitleKeywords = TARGET_JOB_TITLES,
    limit = 1, // PAR DÉFAUT 1 SEUL CONTACT pour économiser les crédits
  } = options;

  // Sélectionner les pays selon la région focus
  const targetCountries = focusRegion === 'DACH' ? DACH_COUNTRIES : focusRegion === 'EU' ? EU_COUNTRIES : [];

  try {
    console.log(`🔍 Lusha: Searching contacts for ${companyDomain} (region: ${focusRegion})`);

    // Construire les filtres pour la requête Prospecting
    // On demande plus de contacts pour pouvoir scorer et prendre le meilleur
    const searchLimit = Math.max(limit * 3, 5); // Demander 3x plus pour scorer, min 5

    const requestBody: Record<string, unknown> = {
      filters: {
        company: {
          domains: [companyDomain],
        },
        contact: {
          departments: focusDepartments,
          seniority: seniorityLevels,
          existingDataPoints: ['work_email', 'phone'], // Email ET téléphone requis
        },
      },
      limit: searchLimit, // Demander plus pour scorer
      offset: 0,
    };

    // Ajouter le filtre de pays si spécifié
    if (targetCountries.length > 0) {
      (requestBody.filters as Record<string, unknown>).contact = {
        ...(requestBody.filters as Record<string, unknown>).contact as Record<string, unknown>,
        locations: {
          countries: targetCountries,
        },
      };
    }

    // Ajouter les mots-clés de titre si spécifiés
    if (jobTitleKeywords.length > 0) {
      (requestBody.filters as Record<string, unknown>).contact = {
        ...(requestBody.filters as Record<string, unknown>).contact as Record<string, unknown>,
        jobTitleKeywords: jobTitleKeywords.slice(0, 5), // Limiter à 5 mots-clés
      };
    }

    console.log('📤 Lusha request filters:', JSON.stringify(requestBody.filters, null, 2));

    const response = await fetch(`${LUSHA_API_BASE}/prospecting/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Lusha API error (${response.status}):`, errorText);

      // Gérer les erreurs spécifiques
      if (response.status === 401) {
        throw new Error('Lusha API key invalid or expired');
      }
      if (response.status === 429) {
        throw new Error('Lusha API rate limit exceeded');
      }
      if (response.status === 402) {
        throw new Error('Lusha credits exhausted');
      }

      return [];
    }

    const data: LushaProspectingResponse = await response.json();

    console.log(`✅ Lusha found ${data.contacts?.length || 0} contacts (total: ${data.totalResults})`);

    if (!data.contacts || data.contacts.length === 0) {
      console.log('📊 Lusha: No contacts found');
      return [];
    }

    // Scorer tous les contacts pour trouver le plus qualifié
    const scoredContacts = data.contacts.map(contact => ({
      contact,
      score: scoreLushaContact(contact, focusRegion),
    }));

    // Trier par score décroissant
    scoredContacts.sort((a, b) => b.score - a.score);

    console.log(`📊 Lusha scores:`, scoredContacts.slice(0, 5).map(sc => ({
      name: sc.contact.fullName,
      title: sc.contact.positions?.find(p => p.isCurrent)?.title,
      country: sc.contact.location?.countryCode,
      hasPhone: !!sc.contact.phoneNumbers?.length,
      score: sc.score,
    })));

    // Prendre seulement les N meilleurs contacts (par défaut 1)
    const topContacts = scoredContacts.slice(0, limit);

    // Convertir les contacts Lusha en format Contact standard
    const contacts: Contact[] = topContacts.map(({ contact: lushaContact, score }) => {
      // Trouver l'email professionnel
      const workEmail = lushaContact.emailAddresses?.find(e => e.type === 'work')?.email
        || lushaContact.emailAddresses?.[0]?.email
        || null;

      // Trouver le téléphone (priorité: direct > work > mobile > autre)
      const phone = lushaContact.phoneNumbers?.find(p => p.type === 'direct')?.number
        || lushaContact.phoneNumbers?.find(p => p.type === 'work')?.number
        || lushaContact.phoneNumbers?.find(p => p.type === 'mobile')?.number
        || lushaContact.phoneNumbers?.[0]?.number
        || null;

      // Trouver le profil LinkedIn
      const linkedinUrl = lushaContact.socialNetworks?.find(s => s.type === 'linkedin')?.url || null;

      // Trouver le poste actuel
      const currentPosition = lushaContact.positions?.find(p => p.isCurrent);

      // Construire la localisation
      let location: string | null = null;
      if (lushaContact.location) {
        const parts = [
          lushaContact.location.city,
          lushaContact.location.country,
        ].filter(Boolean);
        location = parts.length > 0 ? parts.join(', ') : null;
      }

      // Calculer le score de confiance basé sur le score de pertinence
      // Score max théorique ~200, on normalise sur 0.8-0.99
      const confidence = Math.min(0.8 + (score / 500), 0.99);

      console.log(`🎯 Selected contact: ${lushaContact.fullName} (${currentPosition?.title}) - Score: ${score}, Phone: ${phone ? 'YES' : 'NO'}`);

      return {
        name: lushaContact.fullName || `${lushaContact.firstName} ${lushaContact.lastName}`.trim(),
        title: currentPosition?.title || null,
        email: workEmail,
        linkedin_url: linkedinUrl,
        location: location,
        phone: phone,
        source: 'lusha' as const,
        confidence: confidence,
      };
    });

    // Filtrer les contacts sans nom ou email
    const validContacts = contacts.filter(c => c.name && c.email);

    console.log(`📊 Lusha: Returning ${validContacts.length} best contact(s) (requested: ${limit})`);

    return validContacts;
  } catch (error) {
    console.error('❌ Lusha search error:', error);
    throw error;
  }
}

/**
 * Enrichit un contact existant via Lusha Person API
 * Utile pour compléter les infos d'un contact trouvé ailleurs.
 *
 * @param email - Email du contact
 * @param linkedinUrl - URL LinkedIn du contact (optionnel)
 * @returns Contact enrichi ou null
 */
export async function enrichContactWithLusha(
  email?: string | null,
  linkedinUrl?: string | null
): Promise<Contact | null> {
  const apiKey = process.env.LUSHA_API_KEY;

  if (!apiKey) {
    console.log('⚠️ LUSHA_API_KEY not configured');
    return null;
  }

  if (!email && !linkedinUrl) {
    console.log('⚠️ Lusha enrichment requires email or LinkedIn URL');
    return null;
  }

  try {
    console.log(`🔍 Lusha: Enriching contact (email: ${email || 'N/A'}, linkedin: ${linkedinUrl ? 'yes' : 'no'})`);

    const requestBody: Record<string, unknown> = {};

    if (email) {
      requestBody.email = email;
    }
    if (linkedinUrl) {
      requestBody.linkedInUrl = linkedinUrl;
    }

    // Option pour rafraîchir les infos de poste
    requestBody.metadata = {
      refreshJobInfo: true,
    };

    const response = await fetch(`${LUSHA_API_BASE}/v2/person`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Lusha Person API error (${response.status}):`, errorText);
      return null;
    }

    const data: LushaContact = await response.json();

    // Convertir en format Contact
    const workEmail = data.emailAddresses?.find(e => e.type === 'work')?.email
      || data.emailAddresses?.[0]?.email
      || email
      || null;

    const phone = data.phoneNumbers?.find(p => p.type === 'work' || p.type === 'direct')?.number
      || data.phoneNumbers?.[0]?.number
      || null;

    const linkedin = data.socialNetworks?.find(s => s.type === 'linkedin')?.url
      || linkedinUrl
      || null;

    const currentPosition = data.positions?.find(p => p.isCurrent);

    let location: string | null = null;
    if (data.location) {
      const parts = [data.location.city, data.location.country].filter(Boolean);
      location = parts.length > 0 ? parts.join(', ') : null;
    }

    console.log(`✅ Lusha enrichment successful: ${data.fullName}`);

    return {
      name: data.fullName || `${data.firstName} ${data.lastName}`.trim(),
      title: currentPosition?.title || null,
      email: workEmail,
      linkedin_url: linkedin,
      location: location,
      phone: phone,
      source: 'lusha' as const,
      confidence: 0.9, // Haute confiance pour données Lusha enrichies
    };
  } catch (error) {
    console.error('❌ Lusha enrichment error:', error);
    return null;
  }
}

/**
 * Récupère le nombre de crédits Lusha restants
 */
export async function getLushaCreditsRemaining(): Promise<number | null> {
  const apiKey = process.env.LUSHA_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(`${LUSHA_API_BASE}/credits`, {
      method: 'GET',
      headers: {
        'api_key': apiKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.remaining || null;
  } catch {
    return null;
  }
}
