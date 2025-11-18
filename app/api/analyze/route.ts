import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scrapeWithJinaRetry } from '@/lib/services/jina-scraper';
import { analyzeProductRetry } from '@/lib/services/claude-analyzer';
import { analyzeBrand } from '@/lib/services/claude-brand-analyzer';
import { findCompanyContacts, mergeContacts } from '@/lib/services/hunter-io';
import { enrichContactsFromWebsite } from '@/lib/services/contact-page-enrichment';
import { analyzeRequestSchema } from '@/lib/utils/validators';
import { AI_CONFIDENCE_THRESHOLD } from '@/lib/utils/constants';

export async function POST(request: NextRequest) {
  try {
    // Parse et valide le body
    const body = await request.json();
    const { url, type = 'product' } = body; // type: 'product' | 'brand'

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    if (type !== 'product' && type !== 'brand') {
      return NextResponse.json(
        { success: false, error: 'Type must be "product" or "brand"' },
        { status: 400 }
      );
    }

    console.log(`🔍 Starting ${type} analysis for URL:`, url);

    // Étape 1: Scraping avec Jina AI Reader
    console.log('📡 Step 1: Scraping with Jina AI Reader...');
    const scrapedData = await scrapeWithJinaRetry(url);
    console.log('✅ Scraping successful:', {
      title: scrapedData.title,
      sourceType: scrapedData.sourceType,
      imagesCount: scrapedData.images.length,
    });

    const supabase = await createClient();

    // PRODUCT ANALYSIS BRANCH
    if (type === 'product') {
      // Étape 2: Récupérer les catégories depuis Supabase (via RPC)
      console.log('📊 Step 2: Fetching categories from Supabase...');

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
        subcategory: analysis.product.subcategory,
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
          const hunterContacts = await findCompanyContacts(
            analysis.company.website,
            analysis.company.parent_company || null,
            5
          );

          if (hunterContacts.length > 0) {
            console.log(`✅ Hunter.io found ${hunterContacts.length} contacts`);
            analysis.contacts = mergeContacts(analysis.contacts, hunterContacts);
          }
        } catch (error) {
          console.error('⚠️ Hunter.io error (continuing):', error);
        }
      }

      // Étape 3.6: Enrichir avec les pages Contact/B2B du site
      if (analysis.company.website) {
        console.log('🔍 Step 3.6: Scraping contact pages...');
        try {
          const contactPageContacts = await enrichContactsFromWebsite(analysis.company.website);
          if (contactPageContacts.length > 0) {
            analysis.contacts = mergeContacts(analysis.contacts, contactPageContacts);
          }
        } catch (error) {
          console.error('⚠️ Contact page enrichment error:', error);
        }
      }

      // Étape 4: Trouver les IDs des catégories
      const category = analysis.product.category
        ? categories?.find(
            (c: any) => c.name_en?.toLowerCase() === analysis.product.category?.toLowerCase()
          )
        : null;
      const subcategory = analysis.product.subcategory
        ? subcategories?.find(
            (s: any) => s.name_en?.toLowerCase() === analysis.product.subcategory?.toLowerCase()
          )
        : null;

      // Étape 5: Sauvegarder dans Supabase (via RPC)
      console.log('💾 Step 4: Saving product to Supabase...');

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
          p_company_parent: analysis.company.parent_company || null,
          p_company_website: analysis.company.website || null,
          p_company_email: analysis.company.email || null,
          p_company_linkedin: analysis.company.linkedin || null,
          p_company_country: analysis.company.country || null,
          p_ai_confidence_score: analysis.confidence,
          p_ai_raw_analysis: analysis as any,
          p_contacts: analysis.contacts || [],
        });

      if (insertError) {
        throw new Error(`Failed to save product: ${insertError.message}`);
      }

      console.log('✅ Product saved successfully:', product.id);

      return NextResponse.json({
        success: true,
        type: 'product',
        product: {
          id: product.id,
          name: product.name,
          category: analysis.product.category,
          subcategory: analysis.product.subcategory,
          company: analysis.company.name,
          confidence: analysis.confidence,
          contactsFound: analysis.contacts.length,
        },
        message: 'Produit analysé et sauvegardé avec succès',
      });
    }

    // BRAND ANALYSIS BRANCH
    if (type === 'brand') {
      console.log('🤖 Step 2: Analyzing brand with Claude API...');
      const brandAnalysis = await analyzeBrand(scrapedData);
      console.log('✅ Brand analysis successful:', {
        brandName: brandAnalysis.brand.name,
        logo: brandAnalysis.visuals.logo_url ? 'Found' : 'Missing',
        bestSellers: brandAnalysis.best_sellers.length,
        confidence: brandAnalysis.confidence,
      });

      // Vérifier le seuil de confiance
      if (brandAnalysis.confidence < AI_CONFIDENCE_THRESHOLD) {
        console.warn('⚠️ Low confidence score:', brandAnalysis.confidence);
      }

      // Enrichissement des contacts (même logique que products)
      if (brandAnalysis.company.website && process.env.HUNTER_API_KEY) {
        console.log('🔍 Step 3: Enriching contacts with Hunter.io...');
        try {
          const hunterContacts = await findCompanyContacts(
            brandAnalysis.company.website,
            brandAnalysis.company.parent_company || null,
            5
          );

          if (hunterContacts.length > 0) {
            console.log(`✅ Hunter.io found ${hunterContacts.length} contacts`);
            brandAnalysis.contacts = mergeContacts(brandAnalysis.contacts, hunterContacts);
          }
        } catch (error) {
          console.error('⚠️ Hunter.io error (continuing):', error);
        }
      }

      if (brandAnalysis.company.website) {
        console.log('🔍 Step 4: Scraping contact pages...');
        try {
          const contactPageContacts = await enrichContactsFromWebsite(brandAnalysis.company.website);
          if (contactPageContacts.length > 0) {
            brandAnalysis.contacts = mergeContacts(brandAnalysis.contacts, contactPageContacts);
          }
        } catch (error) {
          console.error('⚠️ Contact page enrichment error:', error);
        }
      }

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();

      // Sauvegarder dans Supabase
      console.log('💾 Step 5: Saving brand to Supabase...');

      const { data: brand, error: insertError } = await supabase
        .rpc('insert_prospection_brand', {
          p_source_url: url,
          p_source_type: scrapedData.sourceType,
          p_name: brandAnalysis.brand.name,
          p_tagline: brandAnalysis.brand.tagline,
          p_description: brandAnalysis.brand.description,
          p_logo_url: brandAnalysis.visuals.logo_url,
          p_brand_images: brandAnalysis.visuals.brand_images,
          p_best_sellers: brandAnalysis.best_sellers as any,
          p_categories: brandAnalysis.brand.categories,
          p_company_name: brandAnalysis.company.name,
          p_company_website: brandAnalysis.company.website,
          p_company_email: brandAnalysis.company.email,
          p_company_linkedin: brandAnalysis.company.linkedin,
          p_company_country: brandAnalysis.company.country,
          p_company_parent: brandAnalysis.company.parent_company,
          p_company_founded_year: brandAnalysis.company.founded_year,
          p_company_has_ecommerce: brandAnalysis.company.has_ecommerce,
          p_contacts: brandAnalysis.contacts as any,
          p_ai_confidence_score: brandAnalysis.confidence,
          p_ai_raw_analysis: brandAnalysis as any,
          p_created_by_user_id: user?.id || null,
        });

      if (insertError) {
        throw new Error(`Failed to save brand: ${insertError.message}`);
      }

      console.log('✅ Brand saved successfully:', brand.id);

      return NextResponse.json({
        success: true,
        type: 'brand',
        brand: {
          id: brand.id,
          name: brand.name,
          tagline: brand.tagline,
          logo: brandAnalysis.visuals.logo_url ? 'Found' : 'Missing',
          bestSellers: brandAnalysis.best_sellers.length,
          categories: brandAnalysis.brand.categories,
          company: brandAnalysis.company.name,
          confidence: brandAnalysis.confidence,
          contactsFound: brandAnalysis.contacts.length,
        },
        message: 'Marque analysée et sauvegardée avec succès',
      });
    }
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
