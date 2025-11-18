import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/brands/[id]
 * Supprime définitivement une marque
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('🗑️ DELETE /api/brands/[id] - Received:', { id });

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

    // Supprimer la marque via RPC
    const { data, error } = await supabase
      .rpc('delete_prospection_brand', {
        p_brand_id: id,
      });

    if (error) {
      console.error('❌ Supabase error deleting brand:', error);
      return NextResponse.json(
        { success: false, error: error.message, details: error },
        { status: 500 }
      );
    }

    console.log('✅ Brand deleted:', id);

    return NextResponse.json({
      success: true,
      deleted: data,
    });
  } catch (error) {
    console.error('❌ Error in DELETE /api/brands/[id]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/brands/[id]
 * Met à jour une marque (statut principalement)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    console.log('📝 PATCH /api/brands/[id] - Received:', { id, status });

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

    // Mise à jour du statut via RPC
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
        .rpc('update_prospection_brand_status', {
          p_brand_id: id,
          p_new_status: status,
        });

      if (error) {
        console.error('❌ Supabase error updating status:', error);
        return NextResponse.json(
          { success: false, error: error.message, details: error },
          { status: 500 }
        );
      }

      console.log('✅ Brand status updated:', id, '→', status);

      return NextResponse.json({
        success: true,
        brand: data,
      });
    }

    // Aucun champ reconnu
    return NextResponse.json(
      { success: false, error: 'No valid fields to update (status required)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Error in PATCH /api/brands/[id]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
