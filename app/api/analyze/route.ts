import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scrapeWithJinaRetry } from '@/lib/services/jina-scraper';
import { analyzeProductRetry } from '@/lib/services/claude-analyzer';
import { findCompanyContacts, mergeContacts } from '@/lib/services/hunter-io';
import { analyzeRequestSchema } from '@/lib/utils/validators';
import { AI_CONFIDENCE_THRESHOLD } from '@/lib/utils/constants';

export async function POST(request: NextRequest) {
  try {
    // Parse et valide le body
    const body = await request.json();
    const { url } = analyzeRequestSchema.parse(body);

    console.log('🔍 Starting analysis for URL:', url);

    // Étape 1: Scraping avec Jina AI Reader
    console.log('📡 Step 1: Scraping with Jina AI Reader...');
    const scrapedData = await scrapeWithJinaRetry(url);
    console.log('✅ Scraping successful:', {
      title: scrapedData.title,
      sourceType: scrapedData.sourceType,
      imagesCount: scrapedData.images.length,
    });

    // Étape 2: Récupérer les catégories depuis Supabase (via RPC)
    console.log('📊 Step 2: Fetching categories from Supabase...');
    const supabase = await createClient();

    const { data: categories, error: catError } = await supabase
      .rpc('get_prospection_categories');

    if (catError) {
      throw new Error(`Failed to fetch categories: ${catError.message}`);
    }

    const { data: subcategories, error: subError } = await supabase
      .rpc('get_prospection_subcategories');

    if (subError) {
      throw new Error(`Failed to fetch subcategories: ${subError.message}`);
    }

    console.log('✅ Categories fetched:', categories?.length, 'categories');

    // Étape 3: Analyse avec Claude API
    console.log('🤖 Step 3: Analyzing with Claude API...');
    const analysis = await analyzeProductRetry(scrapedData, categories || [], subcategories || []);
    console.log('✅ Analysis successful:', {
      productName: analysis.product.name,
      category: analysis.product.category,
      confidence: analysis.confidence,
    });

    // Vérifier le seuil de confiance
    if (analysis.confidence < AI_CONFIDENCE_THRESHOLD) {
      console.warn('⚠️ Low confidence score:', analysis.confidence);
    }

    // Étape 3.5: Enrichir les contacts avec Hunter.io (si domaine disponible)
    if (analysis.company.website && process.env.HUNTER_API_KEY) {
      console.log('🔍 Step 3.5: Enriching contacts with Hunter.io...');
      try {
        const hunterContacts = await findCompanyContacts(analysis.company.website, 5);

        if (hunterContacts.length > 0) {
          console.log(`✅ Hunter.io found ${hunterContacts.length} contacts`);
          // Merger les contacts Claude + Hunter.io
          analysis.contacts = mergeContacts(analysis.contacts, hunterContacts);
          console.log(`✅ Total contacts after merge: ${analysis.contacts.length}`);
        } else {
          console.log('ℹ️ Hunter.io found no contacts');
        }
      } catch (error) {
        console.error('⚠️ Hunter.io error (continuing without enrichment):', error);
        // Continue sans Hunter.io en cas d'erreur
      }
    } else if (!analysis.company.website) {
      console.log('ℹ️ No company website found, skipping Hunter.io enrichment');
    } else if (!process.env.HUNTER_API_KEY) {
      console.log('ℹ️ HUNTER_API_KEY not configured, skipping contact enrichment');
    }

    // Étape 4: Trouver les IDs des catégories
    const category = analysis.product.category
      ? categories?.find(
          c => c.name_en?.toLowerCase() === analysis.product.category?.toLowerCase()
        )
      : null;
    const subcategory = analysis.product.subcategory
      ? subcategories?.find(
          s => s.name_en?.toLowerCase() === analysis.product.subcategory?.toLowerCase()
        )
      : null;

    if (!category) {
      console.error('❌ Category not found:', analysis.product.category);
    }
    if (!subcategory) {
      console.error('❌ Subcategory not found:', analysis.product.subcategory);
    }

    // Étape 5: Sauvegarder dans Supabase (via RPC)
    console.log('💾 Step 4: Saving to Supabase...');
    console.log('✅ Contacts found:', analysis.contacts.length);

    const { data: product, error: insertError } = await supabase
      .rpc('insert_prospection_product', {
        p_source_url: url,
        p_source_type: scrapedData.sourceType,
        p_name: analysis.product.name,
        p_description: analysis.product.description,
        p_category_id: category?.id || null,
        p_subcategory_id: subcategory?.id || null,
        p_category: analysis.product.category || null,
        p_subcategory: analysis.product.subcategory || null,
        p_images: scrapedData.images,
        p_msrp_eu: analysis.pricing.estimatedMSRP_EU || null,
        p_msrp_ch: analysis.pricing.estimatedMSRP_CH || null,
        p_msrp_source_url: analysis.pricing.sourceURL || null,
        p_company_name: analysis.company.name,
        p_company_website: analysis.company.website || null,
        p_company_email: analysis.company.email || null,
        p_company_linkedin: analysis.company.linkedin || null,
        p_company_country: analysis.company.country || null,
        p_ai_confidence_score: analysis.confidence,
        p_ai_raw_analysis: analysis as any,
        p_contacts: analysis.contacts || [], // NOUVEAU: Contacts
      });

    if (insertError) {
      throw new Error(`Failed to save product: ${insertError.message}`);
    }

    console.log('✅ Product saved successfully:', product.id);

    // Étape 6: Retourner le résultat
    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        category: analysis.product.category,
        subcategory: analysis.product.subcategory,
        company: analysis.company.name,
        confidence: analysis.confidence,
        contactsFound: analysis.contacts.length, // NOUVEAU: Nombre de contacts
      },
      message: 'Produit analysé et sauvegardé avec succès',
    });
  } catch (error) {
    console.error('❌ Analysis error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
