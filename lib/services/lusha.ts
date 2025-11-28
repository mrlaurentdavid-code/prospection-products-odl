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
 * Codes pays DACH et Europe
 */
const DACH_COUNTRIES = ['CH', 'DE', 'AT'];
const EU_COUNTRIES = ['CH', 'DE', 'AT', 'FR', 'NL', 'BE', 'IT', 'ES', 'UK', 'PL', 'SE', 'DK', 'NO', 'FI'];

/**
 * Interface pour les résultats de recherche Lusha
 */
interface LushaSearchResult {
  contactId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle?: string;
  company?: string;
  companyDomain?: string;
  country?: string;
  city?: string;
  linkedinUrl?: string;
}

/**
 * Interface pour les contacts enrichis Lusha
 */
interface LushaEnrichedContact {
  contactId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle?: string;
  company?: string;
  emails?: Array<{ email: string; type: string }>;
  phones?: Array<{ number: string; type: string }>;
  linkedinUrl?: string;
  country?: string;
  city?: string;
}

interface LushaSearchOptions {
  companyDomain: string;
  companyName?: string;
  focusRegion?: 'DACH' | 'EU' | 'ALL';
  focusDepartments?: string[];
  seniorityLevels?: string[];
  limit?: number;
}

/**
 * Vérifie si l'API Lusha est configurée
 */
export function isLushaConfigured(): boolean {
  return !!process.env.LUSHA_API_KEY;
}

/**
 * Score un contact de recherche Lusha selon sa pertinence
 */
function scoreLushaSearchResult(contact: LushaSearchResult, focusRegion: 'DACH' | 'EU' | 'ALL'): number {
  let score = 0;
  const title = (contact.jobTitle || '').toLowerCase();
  const country = (contact.country || '').toUpperCase();

  // Score par pays (priorité DACH)
  if (country === 'CH' || country === 'SWITZERLAND') score += 100;
  else if (country === 'DE' || country === 'GERMANY') score += 80;
  else if (country === 'AT' || country === 'AUSTRIA') score += 70;
  else if (focusRegion === 'EU' && EU_COUNTRIES.some(c => country.includes(c))) score += 50;

  // Score par titre
  if (title.includes('dach') || title.includes('switzerland') || title.includes('suisse')) score += 50;
  if (title.includes('export')) score += 40;
  if (title.includes('country manager') || title.includes('regional manager')) score += 35;
  if (title.includes('sales director') || title.includes('commercial director')) score += 30;
  if (title.includes('business development')) score += 25;
  if (title.includes('sales manager') || title.includes('key account')) score += 20;

  // Bonus si LinkedIn disponible
  if (contact.linkedinUrl) score += 15;

  return score;
}

/**
 * Recherche simplifiée - utilisée comme fallback
 */
async function searchLushaContactsSimplified(options: LushaSearchOptions): Promise<Contact[]> {
  const apiKey = process.env.LUSHA_API_KEY;
  if (!apiKey) return [];

  const { companyDomain, companyName, limit = 1 } = options;

  try {
    console.log(`🔄 Lusha Simplified: Searching for ${companyName || companyDomain}`);

    // Format minimal pour la recherche
    const searchBody = {
      pages: { page: 0, size: 10 },
      filters: {
        companies: {
          include: {
            domains: [companyDomain],
          },
        },
      },
      includePartialContacts: true,
    };

    const response = await fetch(`${LUSHA_API_BASE}/prospecting/contact/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      console.error(`❌ Lusha Simplified search failed (${response.status})`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ Lusha Simplified found ${data.data?.length || 0} contacts`);

    if (!data.data || data.data.length === 0) {
      return [];
    }

    // Prendre le premier contact et l'enrichir
    const contactIds = data.data.slice(0, limit).map((c: LushaSearchResult) => c.contactId);

    // Enrichir
    const enrichResponse = await fetch(`${LUSHA_API_BASE}/prospecting/contact/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      body: JSON.stringify({
        contactIds,
        dataPoints: ['work_email'],
      }),
    });

    if (!enrichResponse.ok) {
      console.error(`❌ Lusha Simplified enrich failed (${enrichResponse.status})`);
      // Retourner les infos de base sans email
      return data.data.slice(0, limit).map((c: LushaSearchResult) => ({
        name: c.fullName,
        title: c.jobTitle || null,
        email: null,
        linkedin_url: c.linkedinUrl || null,
        location: c.city && c.country ? `${c.city}, ${c.country}` : c.country || null,
        phone: null,
        source: 'lusha' as const,
        confidence: 0.7,
      }));
    }

    const enrichData = await enrichResponse.json();
    console.log(`✅ Lusha Simplified enriched ${enrichData.data?.length || 0} contacts`);

    return (enrichData.data || []).map((c: LushaEnrichedContact) => ({
      name: c.fullName,
      title: c.jobTitle || null,
      email: c.emails?.find(e => e.type === 'work')?.email || c.emails?.[0]?.email || null,
      linkedin_url: c.linkedinUrl || null,
      location: c.city && c.country ? `${c.city}, ${c.country}` : c.country || null,
      phone: null,
      source: 'lusha' as const,
      confidence: 0.85,
    }));
  } catch (error) {
    console.error('❌ Lusha Simplified error:', error);
    return [];
  }
}

/**
 * Recherche des contacts qualifiés via Lusha Prospecting API
 * Process en 2 étapes:
 * 1. Search - Trouver les contacts correspondants (gratuit)
 * 2. Enrich - Révéler les données (1 crédit par contact)
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
    limit = 1,
  } = options;

  const targetCountries = focusRegion === 'DACH' ? DACH_COUNTRIES : focusRegion === 'EU' ? EU_COUNTRIES : [];

  try {
    console.log(`🔍 Lusha: Searching contacts for ${companyDomain} (region: ${focusRegion}, company: ${companyName || 'N/A'})`);

    // ÉTAPE 1: Recherche de contacts
    const searchBody: Record<string, unknown> = {
      pages: {
        page: 0,
        size: Math.max(limit * 5, 10),
      },
      filters: {
        companies: {
          include: {
            ...(companyName ? { names: [companyName] } : {}),
            domains: [companyDomain],
          },
        },
        contacts: {
          include: {
            departments: focusDepartments,
            seniority: seniorityLevels,
            existing_data_points: ['work_email'],
          },
        },
      },
      includePartialContacts: true,
    };

    // Ajouter le filtre de localisation
    if (targetCountries.length > 0) {
      const filters = searchBody.filters as Record<string, Record<string, Record<string, unknown>>>;
      filters.contacts.include.locations = targetCountries.map(country => ({ country }));
    }

    console.log('📤 Lusha SEARCH request:', JSON.stringify(searchBody, null, 2));

    const searchResponse = await fetch(`${LUSHA_API_BASE}/prospecting/contact/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      body: JSON.stringify(searchBody),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`❌ Lusha Search API error (${searchResponse.status}):`, errorText);

      if (searchResponse.status === 400) {
        console.log('🔄 Trying simplified search format...');
        return await searchLushaContactsSimplified(options);
      }

      if (searchResponse.status === 401) throw new Error('Lusha API key invalid');
      if (searchResponse.status === 429) throw new Error('Lusha API rate limit exceeded');
      if (searchResponse.status === 402) throw new Error('Lusha credits exhausted');

      return [];
    }

    const searchData = await searchResponse.json();
    console.log(`✅ Lusha Search found ${searchData.data?.length || 0} contacts (total: ${searchData.totalResults || 0})`);

    if (!searchData.data || searchData.data.length === 0) {
      console.log('📊 Lusha: No contacts found, trying simplified search...');
      return await searchLushaContactsSimplified(options);
    }

    // Scorer les contacts
    const scoredContacts = searchData.data.map((contact: LushaSearchResult) => ({
      contact,
      score: scoreLushaSearchResult(contact, focusRegion),
    }));

    scoredContacts.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    console.log(`📊 Lusha scores (top 3):`, scoredContacts.slice(0, 3).map((sc: { contact: LushaSearchResult; score: number }) => ({
      name: sc.contact.fullName,
      title: sc.contact.jobTitle,
      country: sc.contact.country,
      score: sc.score,
    })));

    // Prendre les meilleurs pour l'enrichissement
    const topContacts = scoredContacts.slice(0, limit);
    const contactIds = topContacts.map((sc: { contact: LushaSearchResult }) => sc.contact.contactId);

    if (contactIds.length === 0) {
      return [];
    }

    // ÉTAPE 2: Enrichir les contacts (consomme les crédits)
    console.log(`🔄 Lusha: Enriching ${contactIds.length} contact(s)...`);

    const enrichResponse = await fetch(`${LUSHA_API_BASE}/prospecting/contact/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      body: JSON.stringify({
        contactIds,
        dataPoints: ['work_email'],
      }),
    });

    if (!enrichResponse.ok) {
      const errorText = await enrichResponse.text();
      console.error(`❌ Lusha Enrich API error (${enrichResponse.status}):`, errorText);

      // Retourner les infos de base sans email
      return topContacts.map(({ contact, score }: { contact: LushaSearchResult; score: number }) => ({
        name: contact.fullName,
        title: contact.jobTitle || null,
        email: null,
        linkedin_url: contact.linkedinUrl || null,
        location: contact.city && contact.country ? `${contact.city}, ${contact.country}` : contact.country || null,
        phone: null,
        source: 'lusha' as const,
        confidence: Math.min(0.6 + (score / 500), 0.8),
      }));
    }

    const enrichData = await enrichResponse.json();
    console.log(`✅ Lusha Enrich returned ${enrichData.data?.length || 0} contacts`);

    // Convertir en format Contact
    const contacts: Contact[] = (enrichData.data || []).map((c: LushaEnrichedContact) => {
      const workEmail = c.emails?.find(e => e.type === 'work')?.email || c.emails?.[0]?.email || null;
      const location = c.city && c.country ? `${c.city}, ${c.country}` : c.country || null;

      console.log(`🎯 Enriched contact: ${c.fullName} (${c.jobTitle}) - Email: ${workEmail ? 'YES' : 'NO'}`);

      return {
        name: c.fullName,
        title: c.jobTitle || null,
        email: workEmail,
        linkedin_url: c.linkedinUrl || null,
        location,
        phone: null,
        source: 'lusha' as const,
        confidence: workEmail ? 0.9 : 0.7,
      };
    });

    // Filtrer les contacts sans nom
    const validContacts = contacts.filter(c => c.name);

    console.log(`📊 Lusha: Returning ${validContacts.length} contact(s)`);
    return validContacts;

  } catch (error) {
    console.error('❌ Lusha search error:', error);
    throw error;
  }
}

/**
 * Enrichit un contact existant via Lusha Person API
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
    if (email) requestBody.email = email;
    if (linkedinUrl) requestBody.linkedInUrl = linkedinUrl;
    requestBody.metadata = { refreshJobInfo: true };

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

    const data = await response.json();

    const workEmail = data.emailAddresses?.find((e: { type: string }) => e.type === 'work')?.email
      || data.emailAddresses?.[0]?.email
      || email
      || null;

    const phone = data.phoneNumbers?.find((p: { type: string }) => p.type === 'work' || p.type === 'direct')?.number
      || data.phoneNumbers?.[0]?.number
      || null;

    const linkedin = data.socialNetworks?.find((s: { type: string }) => s.type === 'linkedin')?.url
      || linkedinUrl
      || null;

    const currentPosition = data.positions?.find((p: { isCurrent: boolean }) => p.isCurrent);

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
      location,
      phone,
      source: 'lusha' as const,
      confidence: 0.9,
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
  if (!apiKey) return null;

  try {
    const response = await fetch(`${LUSHA_API_BASE}/credits`, {
      method: 'GET',
      headers: { 'api_key': apiKey },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.remaining || null;
  } catch {
    return null;
  }
}
