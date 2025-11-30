import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const LUSHA_API_BASE = 'https://api.lusha.com';

// Codes pays par région
const REGION_COUNTRIES: Record<string, string[]> = {
  DACH: ['CH', 'DE', 'AT'],
  CH: ['CH'],
  DE: ['DE'],
  AT: ['AT'],
  FR: ['FR'],
  EU: ['CH', 'DE', 'AT', 'FR', 'NL', 'BE', 'IT', 'ES', 'UK', 'PL', 'SE', 'DK', 'NO', 'FI'],
  ALL: [],
};

// Départements pertinents pour la prospection
const SALES_DEPARTMENTS = [
  'sales',
  'business_development',
  'marketing',
  'management',
  'executive',
];

/**
 * POST /api/lusha/search
 * Recherche GRATUITE de contacts Lusha (sans révéler les données)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, companyDomain, region = 'DACH', brandName } = body;

    console.log('🔮 Lusha Search API:', { companyName, companyDomain, brandName, region });

    // Vérifier l'authentification
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier la clé API Lusha
    const apiKey = process.env.LUSHA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Lusha API non configurée' }, { status: 500 });
    }

    // Construire la requête de recherche
    // PRIORITÉ: domain > brandName > companyName
    // On utilise le domain si disponible car c'est plus fiable
    const targetCountries = REGION_COUNTRIES[region] || [];

    // Construire les filtres company
    const companyFilters: Record<string, unknown> = {};
    if (companyDomain) {
      // Si on a un domain, on l'utilise en priorité (plus fiable)
      companyFilters.domains = [companyDomain];
    } else if (brandName) {
      // Sinon on cherche par nom de marque
      companyFilters.names = [brandName];
    } else if (companyName) {
      // En dernier recours, le nom de l'entreprise
      companyFilters.names = [companyName];
    }

    const searchBody: Record<string, unknown> = {
      pages: { page: 0, size: 50 }, // Récupérer jusqu'à 50 contacts
      filters: {
        companies: {
          include: companyFilters,
        },
        // Filtres contacts simplifiés - on ne filtre que sur la localisation si spécifiée
        // Les filtres departments/seniority sont trop restrictifs
        ...(targetCountries.length > 0 && region !== 'ALL' ? {
          contacts: {
            include: {
              locations: targetCountries.map(country => ({ country })),
            },
          },
        } : {}),
      },
    };

    console.log('📤 Lusha search request:', JSON.stringify(searchBody, null, 2));

    // Appeler l'API Lusha
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

      // Gestion des erreurs spécifiques
      if (searchResponse.status === 429) {
        return NextResponse.json(
          { error: 'Limite de requêtes Lusha atteinte. Veuillez patienter 1-2 minutes avant de réessayer.' },
          { status: 429 }
        );
      }

      if (searchResponse.status === 400) {
        return await handleSimplifiedSearch(apiKey, companyName, companyDomain);
      }

      if (searchResponse.status === 401) {
        return NextResponse.json(
          { error: 'Clé API Lusha invalide ou expirée.' },
          { status: 401 }
        );
      }

      if (searchResponse.status === 402) {
        return NextResponse.json(
          { error: 'Crédits Lusha épuisés. Veuillez recharger votre compte.' },
          { status: 402 }
        );
      }

      return NextResponse.json(
        { error: `Erreur Lusha: ${searchResponse.status}` },
        { status: searchResponse.status }
      );
    }

    let searchData = await searchResponse.json();
    console.log(`✅ Lusha found ${searchData.data?.length || 0} contacts (with region filter: ${region})`);

    // Si aucun résultat avec le filtre région, réessayer SANS filtre
    if ((!searchData.data || searchData.data.length === 0) && region !== 'ALL') {
      console.log('🔄 No results with region filter, retrying without location filter...');

      const searchBodyNoFilter: Record<string, unknown> = {
        pages: { page: 0, size: 50 },
        filters: {
          companies: {
            include: companyFilters,
          },
        },
      };

      const retryResponse = await fetch(`${LUSHA_API_BASE}/prospecting/contact/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_key': apiKey,
        },
        body: JSON.stringify(searchBodyNoFilter),
      });

      if (retryResponse.ok) {
        searchData = await retryResponse.json();
        console.log(`✅ Retry without filter found ${searchData.data?.length || 0} contacts`);
      }
    }

    // Log de la structure du premier contact pour debug
    if (searchData.data?.[0]) {
      console.log('📋 Lusha contact structure sample:', JSON.stringify(searchData.data[0], null, 2));
    }

    // Mapper les résultats avec toutes les infos disponibles
    const contacts = (searchData.data || []).map((c: any) => ({
      contactId: c.contactId,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: c.fullName || c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      jobTitle: c.jobTitle,
      company: c.companyName || c.company,
      companyDomain: c.fqdn || c.companyDomain,
      companyDescription: c.companyDescription ? c.companyDescription.substring(0, 200) : null, // Limiter à 200 chars
      country: c.country || c.companyCountry,
      city: c.city || c.companyCity,
      linkedinUrl: c.linkedinUrl || c.socialLink,
      hasEmail: c.hasWorkEmail || c.hasEmails || c.existingDataPoints?.includes('work_email') || false,
      hasPhone: c.hasDirectPhone || c.hasMobilePhone || c.hasPhones || c.existingDataPoints?.includes('work_phone') || false,
      hasLocation: c.hasContactLocation || c.hasCompanyCountry || c.hasCompanyCity || false,
      hasLinkedin: c.hasSocialLink || false,
    }));

    // Récupérer les crédits restants
    let creditsRemaining = null;
    try {
      const creditsResponse = await fetch(`${LUSHA_API_BASE}/credits`, {
        method: 'GET',
        headers: { 'api_key': apiKey },
      });
      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json();
        creditsRemaining = creditsData.remaining;
      }
    } catch (e) {
      console.error('Failed to get Lusha credits:', e);
    }

    return NextResponse.json({
      success: true,
      contacts,
      totalResults: searchData.totalResults || contacts.length,
      creditsRemaining,
    });

  } catch (error) {
    console.error('❌ Lusha search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

/**
 * Recherche simplifiée si la recherche complète échoue
 */
async function handleSimplifiedSearch(apiKey: string, companyName?: string, companyDomain?: string) {
  console.log('🔄 Trying simplified Lusha search...');

  const searchBody = {
    pages: { page: 0, size: 25 },
    filters: {
      companies: {
        include: {
          ...(companyDomain ? { domains: [companyDomain] } : {}),
          ...(companyName && !companyDomain ? { names: [companyName] } : {}),
        },
      },
    },
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
    const errorText = await response.text();
    console.error(`❌ Simplified search failed (${response.status}):`, errorText);
    return NextResponse.json({ error: 'Recherche échouée', contacts: [] }, { status: 200 });
  }

  const data = await response.json();
  console.log(`✅ Simplified search found ${data.data?.length || 0} contacts`);

  // Log structure for debugging
  if (data.data?.[0]) {
    console.log('📋 Contact structure:', JSON.stringify(data.data[0], null, 2));
  }

  const contacts = (data.data || []).map((c: any) => ({
    contactId: c.contactId,
    firstName: c.firstName,
    lastName: c.lastName,
    fullName: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name,
    jobTitle: c.jobTitle || c.title,
    company: c.company,
    country: c.country,
    city: c.city,
    linkedinUrl: c.linkedinUrl,
    hasEmail: c.existingDataPoints?.includes('work_email') || false,
    hasPhone: c.existingDataPoints?.includes('work_phone') || false,
  }));

  return NextResponse.json({
    success: true,
    contacts,
    totalResults: data.totalResults || contacts.length,
    creditsRemaining: null,
  });
}
