import { createClient } from '@supabase/supabase-js';

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Trouver le produit hofats.com
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
    console.log('ℹ️ Product hofats.com not found (maybe already deleted)');
    return;
  }

  console.log('🔍 Found product:', hofatsProduct.id, hofatsProduct.name);

  // 2. Supprimer via RPC function
  const { data, error } = await supabase
    .rpc('delete_product', {
      p_product_id: hofatsProduct.id,
    });

  if (error) {
    console.error('❌ Error deleting:', error);
  } else {
    console.log('✅ Produit hofats.com supprimé avec succès');
  }
}

main();
