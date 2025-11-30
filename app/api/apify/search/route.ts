import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchLinkedInEmployees, isApifyConfigured } from '@/lib/services/apify';

/**
 * POST /api/apify/search
 * Recherche de contacts via Apify LinkedIn Scraper
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, companyDomain, companyLinkedInUrl, maxResults = 50 } = body;

    console.log('🔍 Apify Search API:', { companyName, companyDomain, companyLinkedInUrl, maxResults });

    // Vérifier l'authentification
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier la configuration Apify
    if (!isApifyConfigured()) {
      return NextResponse.json(
        { error: 'APIFY_API_TOKEN non configuré. Ajoutez-le dans les variables d\'environnement.' },
        { status: 500 }
      );
    }

    // Valider les paramètres
    if (!companyName && !companyDomain && !companyLinkedInUrl) {
      return NextResponse.json(
        { error: 'Veuillez fournir au moins un critère de recherche (nom, domaine ou URL LinkedIn)' },
        { status: 400 }
      );
    }

    // Lancer la recherche Apify
    const result = await searchLinkedInEmployees({
      companyName,
      companyDomain,
      companyLinkedInUrl,
      maxResults,
    });

    if (!result.success) {
      console.error('❌ Apify search failed:', result.error);
      return NextResponse.json(
        {
          error: result.error || 'Recherche Apify échouée',
          contacts: [],
          totalResults: 0,
        },
        { status: 200 } // On retourne 200 avec erreur pour ne pas casser le frontend
      );
    }

    // Mapper les contacts au format attendu par le frontend
    const contacts = result.contacts.map((c) => ({
      // Identifiant unique basé sur LinkedIn URL ou nom
      contactId: c.linkedinUrl || `apify-${c.name?.replace(/\s+/g, '-').toLowerCase()}`,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: c.name,
      jobTitle: c.title,
      company: c.company,
      companyDomain: companyDomain, // On reprend le domaine de la requête
      country: extractCountryFromLocation(c.location),
      city: extractCityFromLocation(c.location),
      location: c.location,
      linkedinUrl: c.linkedinUrl,
      profileImageUrl: c.profileImageUrl,
      // Indicateurs de disponibilité
      hasEmail: !!c.email,
      hasPhone: false, // Apify LinkedIn scraper ne récupère pas les téléphones
      hasLocation: !!c.location,
      hasLinkedin: !!c.linkedinUrl,
      // Email si disponible (rare sans enrichissement)
      email: c.email,
      // Source
      source: 'apify',
    }));

    console.log(`✅ Apify: Returning ${contacts.length} contacts`);

    return NextResponse.json({
      success: true,
      contacts,
      totalResults: result.totalResults,
      source: 'apify',
    });

  } catch (error) {
    console.error('❌ Apify search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

/**
 * Extrait le pays d'une chaîne de localisation
 * Ex: "Zurich, Switzerland" -> "Switzerland"
 */
function extractCountryFromLocation(location?: string): string | null {
  if (!location) return null;

  const parts = location.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }

  // Détecter les pays courants
  const countries = ['Switzerland', 'Germany', 'France', 'Austria', 'USA', 'UK', 'Netherlands'];
  for (const country of countries) {
    if (location.toLowerCase().includes(country.toLowerCase())) {
      return country;
    }
  }

  return location;
}

/**
 * Extrait la ville d'une chaîne de localisation
 * Ex: "Zurich, Switzerland" -> "Zurich"
 */
function extractCityFromLocation(location?: string): string | null {
  if (!location) return null;

  const parts = location.split(',').map(p => p.trim());
  if (parts.length >= 1) {
    return parts[0];
  }

  return null;
}
