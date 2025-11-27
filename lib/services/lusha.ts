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
 * Recherche des contacts qualifiés via Lusha Prospecting API
 * Optimisé pour économiser les crédits en ciblant précisément les profils recherchés.
 *
 * @param options - Options de recherche
 * @returns Liste de contacts qualifiés
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
    limit = 5,
  } = options;

  // Sélectionner les pays selon la région focus
  const targetCountries = focusRegion === 'DACH' ? DACH_COUNTRIES : focusRegion === 'EU' ? EU_COUNTRIES : [];

  try {
    console.log(`🔍 Lusha: Searching contacts for ${companyDomain} (region: ${focusRegion})`);

    // Construire les filtres pour la requête Prospecting
    const requestBody: Record<string, unknown> = {
      filters: {
        company: {
          domains: [companyDomain],
        },
        contact: {
          departments: focusDepartments,
          seniority: seniorityLevels,
          existingDataPoints: ['work_email'], // S'assurer qu'on a un email
        },
      },
      limit: limit,
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

    // Convertir les contacts Lusha en format Contact standard
    const contacts: Contact[] = (data.contacts || []).map((lushaContact) => {
      // Trouver l'email professionnel
      const workEmail = lushaContact.emailAddresses?.find(e => e.type === 'work')?.email
        || lushaContact.emailAddresses?.[0]?.email
        || null;

      // Trouver le téléphone
      const phone = lushaContact.phoneNumbers?.find(p => p.type === 'work' || p.type === 'direct')?.number
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

      // Calculer le score de confiance
      let confidence = 0.8; // Base pour Lusha (données vérifiées)

      // Bonus si dans la région DACH
      if (lushaContact.location?.countryCode && DACH_COUNTRIES.includes(lushaContact.location.countryCode)) {
        confidence += 0.1;
      }

      // Bonus si titre contient des mots-clés pertinents
      const title = currentPosition?.title?.toLowerCase() || '';
      if (title.includes('sales') || title.includes('export') || title.includes('business development')) {
        confidence += 0.05;
      }

      return {
        name: lushaContact.fullName || `${lushaContact.firstName} ${lushaContact.lastName}`.trim(),
        title: currentPosition?.title || null,
        email: workEmail,
        linkedin_url: linkedinUrl,
        location: location,
        phone: phone,
        source: 'lusha' as const,
        confidence: Math.min(confidence, 1.0),
      };
    });

    // Filtrer les contacts sans nom ou email
    const validContacts = contacts.filter(c => c.name && c.email);

    console.log(`📊 Lusha: ${validContacts.length} valid contacts after filtering`);

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
