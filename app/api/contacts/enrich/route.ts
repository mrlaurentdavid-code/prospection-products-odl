import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findCompanyContacts, mergeAndDeduplicateContacts } from '@/lib/services/hunter-io';
import { enrichContactsFromWebsite } from '@/lib/services/contact-page-enrichment';
import { searchLushaContacts, isLushaConfigured, getLushaCreditsRemaining } from '@/lib/services/lusha';
import { Contact } from '@/lib/utils/validators';

/**
 * POST /api/contacts/enrich
 * Relance la recherche de contacts via Hunter.io + scraping des pages contact
 * Optionnel: useLusha=true pour recherche avancée Lusha (consomme des crédits)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId, useLusha = false, lushaRegion = 'DACH' } = body;

    console.log('🔍 POST /api/contacts/enrich - Received:', { entityType, entityId, useLusha, lushaRegion });

    // Validation des paramètres
    if (!entityType || !['product', 'brand'].includes(entityType)) {
      return NextResponse.json(
        { error: 'entityType doit être "product" ou "brand"' },
        { status: 400 }
      );
    }

    if (!entityId) {
      return NextResponse.json(
        { error: 'entityId est requis' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Récupérer l'entité avec ses informations via RPC
    const { data: entityData, error: fetchError } = await supabase
      .rpc('get_entity_contacts', {
        p_entity_type: entityType,
        p_entity_id: entityId,
      });

    if (fetchError || !entityData) {
      console.error('❌ Entity not found:', fetchError);
      return NextResponse.json(
        { error: `${entityType === 'product' ? 'Produit' : 'Marque'} non trouvé(e)` },
        { status: 404 }
      );
    }

    // Extraire les données de la réponse RPC
    const entity = {
      contacts: entityData.contacts || [],
      company_website: entityData.company_website,
      company_name: entityData.company_name,
      parent_company: entityData.parent_company,
    };

    // Vérifier qu'on a un site web pour chercher
    if (!entity.company_website) {
      return NextResponse.json(
        { error: 'Aucun site web disponible pour cette entité. Impossible d\'enrichir.' },
        { status: 400 }
      );
    }

    console.log('🔍 Enriching contacts for:', entity.company_name, '- Website:', entity.company_website);

    const existingContacts: Contact[] = Array.isArray(entity.contacts) ? entity.contacts : [];

    // Étape 1: Hunter.io enrichment
    let hunterContacts: Contact[] = [];
    try {
      console.log('📧 Step 1: Hunter.io domain search...');
      hunterContacts = await findCompanyContacts(
        entity.company_website,
        entity.parent_company,
        5
      );
      console.log(`✅ Hunter.io found ${hunterContacts.length} contacts`);
    } catch (error) {
      console.error('⚠️ Hunter.io enrichment failed:', error);
      // Continue without Hunter.io results
    }

    // Étape 2: Contact page scraping
    let pageContacts: Contact[] = [];
    try {
      console.log('🌐 Step 2: Contact page scraping...');
      pageContacts = await enrichContactsFromWebsite(entity.company_website);
      console.log(`✅ Page scraping found ${pageContacts.length} contacts`);
    } catch (error) {
      console.error('⚠️ Contact page scraping failed:', error);
      // Continue without page scraping results
    }

    // Étape 3 (optionnelle): Recherche Lusha avancée
    let lushaContacts: Contact[] = [];
    let lushaCreditsUsed = 0;
    let lushaCreditsRemaining: number | null = null;

    if (useLusha && isLushaConfigured()) {
      try {
        console.log(`🔮 Step 3: Lusha advanced search (region: ${lushaRegion})...`);

        // Extraire le domaine du site web
        const websiteUrl = new URL(entity.company_website);
        const companyDomain = websiteUrl.hostname.replace(/^www\./, '');

        lushaContacts = await searchLushaContacts({
          companyDomain,
          companyName: entity.company_name || undefined,
          focusRegion: lushaRegion as 'DACH' | 'EU' | 'ALL',
          limit: 1, // UN SEUL contact pour économiser les crédits
        });

        lushaCreditsUsed = lushaContacts.length; // 1 crédit par contact révélé
        lushaCreditsRemaining = await getLushaCreditsRemaining();

        console.log(`✅ Lusha found ${lushaContacts.length} contacts (credits remaining: ${lushaCreditsRemaining})`);
      } catch (error) {
        console.error('⚠️ Lusha search failed:', error);
        // Continue without Lusha results
      }
    } else if (useLusha && !isLushaConfigured()) {
      console.log('⚠️ Lusha requested but LUSHA_API_KEY not configured');
    }

    // Étape 4: Merge et déduplicate
    console.log('🔄 Step 4: Merging and deduplicating...');
    const allNewContacts = [...hunterContacts, ...pageContacts, ...lushaContacts];
    const mergedContacts = mergeAndDeduplicateContacts(existingContacts, allNewContacts);

    console.log(`📊 Results: ${existingContacts.length} existing + ${allNewContacts.length} new = ${mergedContacts.length} final`);

    // Mettre à jour l'entité avec les contacts enrichis via RPC
    const { data: updatedContacts, error: updateError } = await supabase
      .rpc('update_entity_contacts', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_contacts: mergedContacts,
      });

    if (updateError) {
      console.error('❌ Error updating contacts:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des contacts', details: updateError.message },
        { status: 500 }
      );
    }

    const newContactsCount = mergedContacts.length - existingContacts.length;

    console.log('✅ Enrichment completed. New contacts added:', newContactsCount);

    return NextResponse.json({
      success: true,
      contacts: updatedContacts,
      stats: {
        before: existingContacts.length,
        hunterFound: hunterContacts.length,
        pageScrapingFound: pageContacts.length,
        lushaFound: lushaContacts.length,
        after: mergedContacts.length,
        newAdded: newContactsCount,
      },
      lusha: useLusha ? {
        used: true,
        creditsUsed: lushaCreditsUsed,
        creditsRemaining: lushaCreditsRemaining,
      } : { used: false },
      message: newContactsCount > 0
        ? `${newContactsCount} nouveau(x) contact(s) trouvé(s)${useLusha ? ` (Lusha: ${lushaContacts.length})` : ''}`
        : 'Aucun nouveau contact trouvé',
    });
  } catch (error) {
    console.error('❌ Error in POST /api/contacts/enrich:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contacts/enrich
 * Retourne l'état des services d'enrichissement disponibles (Hunter.io, Lusha)
 */
export async function GET() {
  try {
    const lushaConfigured = isLushaConfigured();
    let lushaCredits: number | null = null;

    if (lushaConfigured) {
      lushaCredits = await getLushaCreditsRemaining();
    }

    return NextResponse.json({
      services: {
        hunterIo: {
          available: !!process.env.HUNTER_API_KEY,
        },
        lusha: {
          available: lushaConfigured,
          creditsRemaining: lushaCredits,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error in GET /api/contacts/enrich:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
