import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findCompanyContacts, mergeAndDeduplicateContacts } from '@/lib/services/hunter-io';
import { enrichContactsFromWebsite } from '@/lib/services/contact-page-enrichment';
import { Contact } from '@/lib/utils/validators';

/**
 * POST /api/contacts/enrich
 * Relance la recherche de contacts via Hunter.io + scraping des pages contact
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId } = body;

    console.log('🔍 POST /api/contacts/enrich - Received:', { entityType, entityId });

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

    // Récupérer l'entité avec ses informations
    const tableName = entityType === 'product' ? 'prospection.products' : 'prospection.brands';

    const { data: entity, error: fetchError } = await supabase
      .from(tableName)
      .select('id, contacts, company_website, company_name, parent_company')
      .eq('id', entityId)
      .single();

    if (fetchError || !entity) {
      console.error('❌ Entity not found:', fetchError);
      return NextResponse.json(
        { error: `${entityType === 'product' ? 'Produit' : 'Marque'} non trouvé(e)` },
        { status: 404 }
      );
    }

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

    // Étape 3: Merge et déduplicate
    console.log('🔄 Step 3: Merging and deduplicating...');
    const allNewContacts = [...hunterContacts, ...pageContacts];
    const mergedContacts = mergeAndDeduplicateContacts(existingContacts, allNewContacts);

    console.log(`📊 Results: ${existingContacts.length} existing + ${allNewContacts.length} new = ${mergedContacts.length} final`);

    // Mettre à jour l'entité avec les contacts enrichis
    const { data: updatedEntity, error: updateError } = await supabase
      .from(tableName)
      .update({ contacts: mergedContacts })
      .eq('id', entityId)
      .select('contacts')
      .single();

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
      contacts: updatedEntity.contacts,
      stats: {
        before: existingContacts.length,
        hunterFound: hunterContacts.length,
        pageScrapingFound: pageContacts.length,
        after: mergedContacts.length,
        newAdded: newContactsCount,
      },
      message: newContactsCount > 0
        ? `${newContactsCount} nouveau(x) contact(s) trouvé(s)`
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
