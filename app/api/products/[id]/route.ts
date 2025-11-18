import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/products/[id]
 * Supprime définitivement un produit
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('🗑️ DELETE /api/products/[id] - Received:', { id });

    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Supprimer le produit via RPC
    const { data, error } = await supabase
      .rpc('delete_product', {
        p_product_id: id,
      });

    if (error) {
      console.error('❌ Supabase error deleting product:', error);
      return NextResponse.json(
        { success: false, error: error.message, details: error },
        { status: 500 }
      );
    }

    console.log('✅ Product deleted:', id);

    return NextResponse.json({
      success: true,
      deleted: data,
    });
  } catch (error) {
    console.error('❌ Error in DELETE /api/products/[id]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products/[id]
 * Met à jour un produit (statut, images, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, images } = body;

    console.log('📝 PATCH /api/products/[id] - Received:', { id, status, images: images?.length });

    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Cas 1: Mise à jour du statut via RPC
    if (status !== undefined) {
      // Valider le statut
      const validStatuses = ['to_review', 'standby', 'contacted', 'archived'];
      if (!validStatuses.includes(status)) {
        console.error('❌ Invalid status:', status);
        return NextResponse.json(
          { success: false, error: 'Invalid status value' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .rpc('update_product_status', {
          p_product_id: id,
          p_status: status,
        });

      if (error) {
        console.error('❌ Supabase error updating status:', error);
        return NextResponse.json(
          { success: false, error: error.message, details: error },
          { status: 500 }
        );
      }

      console.log('✅ Product status updated:', id, '→', status);

      const product = Array.isArray(data) && data.length > 0 ? data[0] : null;

      return NextResponse.json({
        success: true,
        product: product,
      });
    }

    // Cas 2: Mise à jour des images via RPC
    if (images !== undefined) {
      // Valider que c'est un tableau non vide
      if (!Array.isArray(images) || images.length === 0) {
        console.error('❌ Invalid images array:', images);
        return NextResponse.json(
          { success: false, error: 'Images must be a non-empty array' },
          { status: 400 }
        );
      }

      // Valider que toutes les images sont des URLs valides
      const allValidUrls = images.every((img: any) =>
        typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))
      );

      if (!allValidUrls) {
        console.error('❌ Invalid image URLs:', images);
        return NextResponse.json(
          { success: false, error: 'All images must be valid HTTP(S) URLs' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .rpc('update_product_images', {
          p_product_id: id,
          p_images: images,
        });

      if (error) {
        console.error('❌ Supabase error updating images:', error);
        return NextResponse.json(
          { success: false, error: error.message, details: error },
          { status: 500 }
        );
      }

      console.log('✅ Product images updated:', id, '→', images.length, 'images');

      return NextResponse.json({
        success: true,
        product: data,
      });
    }

    // Cas 3: Aucun champ reconnu
    return NextResponse.json(
      { success: false, error: 'No valid fields to update (status or images required)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Error in PATCH /api/products/[id]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
