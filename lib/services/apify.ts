/**
 * Apify Service - LinkedIn Company Employees Scraper
 *
 * Utilise l'actor "caprolok/linkedin-employees-scraper" pour extraire
 * les employés d'une entreprise depuis LinkedIn.
 *
 * Avantages vs Lusha:
 * - Pas de rate limit strict
 * - Données LinkedIn directes (localisation visible)
 * - Coût par utilisation (pas d'abonnement)
 *
 * Documentation: https://docs.apify.com/api/v2
 */

const APIFY_API_BASE = 'https://api.apify.com/v2';

// Actor recommandé pour scraper les employés LinkedIn
const LINKEDIN_EMPLOYEES_ACTOR = 'caprolok/linkedin-employees-scraper';

/**
 * Interface pour les résultats Apify
 */
export interface ApifyContact {
  name: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  location?: string;
  linkedinUrl?: string;
  profileImageUrl?: string;
  email?: string;
  company?: string;
}

export interface ApifySearchOptions {
  companyLinkedInUrl?: string;
  companyName?: string;
  companyDomain?: string;
  maxResults?: number;
}

export interface ApifySearchResult {
  success: boolean;
  contacts: ApifyContact[];
  totalResults: number;
  runId?: string;
  error?: string;
}

/**
 * Vérifie si l'API Apify est configurée
 */
export function isApifyConfigured(): boolean {
  return !!process.env.APIFY_API_TOKEN;
}

/**
 * Construit l'URL LinkedIn de l'entreprise à partir du nom ou domaine
 */
function buildLinkedInCompanyUrl(companyName?: string, companyDomain?: string): string | null {
  // Si on a déjà une URL LinkedIn, la retourner
  if (companyName?.includes('linkedin.com/company/')) {
    return companyName;
  }

  // Sinon, construire une URL de recherche basée sur le nom
  // L'actor accepte aussi juste le nom de l'entreprise
  if (companyName) {
    // Nettoyer le nom pour créer un slug LinkedIn potentiel
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    return `https://www.linkedin.com/company/${slug}`;
  }

  return null;
}

/**
 * Lance un Actor Apify et attend les résultats
 */
async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs: number = 120000
): Promise<{ success: boolean; data?: any[]; error?: string; runId?: string }> {
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    return { success: false, error: 'APIFY_API_TOKEN not configured' };
  }

  try {
    console.log(`🚀 Apify: Starting actor ${actorId}`);
    console.log('📤 Apify input:', JSON.stringify(input, null, 2));

    // Lancer l'actor de manière synchrone (attend jusqu'à 5 min)
    const runResponse = await fetch(
      `${APIFY_API_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${apiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error(`❌ Apify actor run failed (${runResponse.status}):`, errorText);

      if (runResponse.status === 401) {
        return { success: false, error: 'Clé API Apify invalide' };
      }
      if (runResponse.status === 402) {
        return { success: false, error: 'Crédits Apify insuffisants' };
      }

      return { success: false, error: `Erreur Apify: ${runResponse.status}` };
    }

    const data = await runResponse.json();
    console.log(`✅ Apify: Got ${Array.isArray(data) ? data.length : 0} results`);

    return {
      success: true,
      data: Array.isArray(data) ? data : [],
    };
  } catch (error) {
    console.error('❌ Apify error:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return { success: false, error: 'Timeout - la recherche prend trop de temps' };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Recherche les employés d'une entreprise via LinkedIn (Apify)
 */
export async function searchLinkedInEmployees(
  options: ApifySearchOptions
): Promise<ApifySearchResult> {
  const { companyLinkedInUrl, companyName, companyDomain, maxResults = 50 } = options;

  // Construire l'URL LinkedIn
  const linkedInUrl = companyLinkedInUrl || buildLinkedInCompanyUrl(companyName, companyDomain);

  if (!linkedInUrl) {
    return {
      success: false,
      contacts: [],
      totalResults: 0,
      error: 'URL LinkedIn de l\'entreprise requise',
    };
  }

  console.log(`🔍 Apify: Searching employees for ${linkedInUrl}`);

  // Input pour l'actor LinkedIn Employees Scraper
  const input = {
    companyUrls: [linkedInUrl],
    maxEmployees: maxResults,
    includeEmail: true, // Tenter de trouver les emails
  };

  const result = await runApifyActor(LINKEDIN_EMPLOYEES_ACTOR, input, 180000); // 3 min timeout

  if (!result.success) {
    return {
      success: false,
      contacts: [],
      totalResults: 0,
      error: result.error,
    };
  }

  // Mapper les résultats au format standard
  const contacts: ApifyContact[] = (result.data || []).map((item: any) => ({
    name: item.fullName || item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
    firstName: item.firstName,
    lastName: item.lastName,
    title: item.title || item.headline || item.jobTitle,
    location: item.location || item.geoLocation,
    linkedinUrl: item.profileUrl || item.linkedinUrl || item.url,
    profileImageUrl: item.profileImageUrl || item.imageUrl,
    email: item.email,
    company: item.company || item.companyName,
  }));

  // Filtrer les contacts sans nom
  const validContacts = contacts.filter(c => c.name && c.name.trim().length > 0);

  console.log(`📊 Apify: Returning ${validContacts.length} valid contacts`);

  return {
    success: true,
    contacts: validContacts,
    totalResults: validContacts.length,
    runId: result.runId,
  };
}

/**
 * Recherche alternative avec l'actor de recherche de personnes
 */
export async function searchLinkedInPeople(
  companyName: string,
  keywords?: string,
  location?: string,
  maxResults: number = 25
): Promise<ApifySearchResult> {
  const PEOPLE_SEARCH_ACTOR = 'curious_coder/linkedin-people-search-scraper';

  const input = {
    searchTerms: [`${companyName} ${keywords || ''}`.trim()],
    location: location,
    maxResults: maxResults,
  };

  const result = await runApifyActor(PEOPLE_SEARCH_ACTOR, input, 180000);

  if (!result.success) {
    return {
      success: false,
      contacts: [],
      totalResults: 0,
      error: result.error,
    };
  }

  const contacts: ApifyContact[] = (result.data || []).map((item: any) => ({
    name: item.fullName || item.name,
    title: item.title || item.headline,
    location: item.location,
    linkedinUrl: item.profileUrl || item.url,
    profileImageUrl: item.imageUrl,
    company: item.companyName,
  }));

  return {
    success: true,
    contacts: contacts.filter(c => c.name),
    totalResults: contacts.length,
  };
}

/**
 * Récupère le solde/usage Apify
 */
export async function getApifyUsage(): Promise<{ balance?: number; error?: string }> {
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    return { error: 'APIFY_API_TOKEN not configured' };
  }

  try {
    const response = await fetch(`${APIFY_API_BASE}/users/me?token=${apiToken}`);

    if (!response.ok) {
      return { error: 'Failed to fetch Apify usage' };
    }

    const data = await response.json();
    return {
      balance: data.data?.proxy?.groups?.[0]?.availableCount || data.data?.plan?.monthlyUsageCreditsUsd,
    };
  } catch {
    return { error: 'Failed to fetch Apify usage' };
  }
}
