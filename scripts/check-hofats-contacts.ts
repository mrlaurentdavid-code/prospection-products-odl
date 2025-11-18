import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    'https://xewnzetqvrovqjcvwkus.supabase.co',
    'YOUR_SERVICE_ROLE_KEY_HERE'
  );

  // Trouver le produit hofats.com
  const { data: products, error: findError } = await supabase
    .rpc('get_prospection_products_filtered', {
      p_status: null,
      p_category: null,
      p_subcategory: null,
      p_limit: 100,
      p_offset: 0,
    });

  if (findError) {
    console.error('❌ Error finding products:', findError);
    return;
  }

  const hofatsProduct = products?.find((p: any) =>
    p.source_url === 'https://hofats.com/MOON-45-Plancha-Grillset-hoch/00963'
  );

  if (!hofatsProduct) {
    console.log('❌ Product hofats.com not found');
    return;
  }

  console.log('✅ Found product:', hofatsProduct.name);
  console.log('📧 Company:', hofatsProduct.company_name);
  console.log('🌐 Website:', hofatsProduct.company_website);
  console.log('');
  console.log('👥 CONTACTS FOUND:', hofatsProduct.contacts.length);
  console.log('');

  hofatsProduct.contacts.forEach((contact: any, index: number) => {
    console.log(`Contact ${index + 1}:`);
    console.log(`  Name: ${contact.name || 'N/A'}`);
    console.log(`  Title: ${contact.title || 'N/A'}`);
    console.log(`  Email: ${contact.email || 'N/A'}`);
    console.log(`  Phone: ${contact.phone || 'N/A'}`);
    console.log(`  Source: ${contact.source || 'N/A'}`);
    console.log(`  Confidence: ${contact.confidence || 'N/A'}`);
    console.log('');
  });
}

main();
