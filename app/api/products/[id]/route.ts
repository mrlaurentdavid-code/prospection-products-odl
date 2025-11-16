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
 * Met à jour un produit (statut, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    console.log('📝 PATCH /api/products/[id] - Received:', { id, status });

    // Valider le statut
    const validStatuses = ['to_review', 'standby', 'contacted', 'archived'];
    if (status && !validStatuses.includes(status)) {
      console.error('❌ Invalid status:', status);
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

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

    // Mettre à jour le produit via RPC
    const { data, error } = await supabase
      .rpc('update_product_status', {
        p_product_id: id,
        p_status: status,
      });

    if (error) {
      console.error('❌ Supabase error updating product:', error);
      return NextResponse.json(
        { success: false, error: error.message, details: error },
        { status: 500 }
      );
    }

    console.log('✅ Product status updated:', id, '→', status);

    // RPC returns an array, get the first item
    const product = Array.isArray(data) && data.length > 0 ? data[0] : null;

    return NextResponse.json({
      success: true,
      product: product,
    });
  } catch (error) {
    console.error('❌ Error in PATCH /api/products/[id]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
