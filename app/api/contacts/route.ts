import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { contactSchema } from '@/lib/utils/validators';

/**
 * POST /api/contacts
 * Ajoute un contact manuel à un produit ou une marque
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId, contact } = body;

    console.log('➕ POST /api/contacts - Received:', { entityType, entityId, contact });

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

    // Valider le contact avec Zod
    const validatedContact = contactSchema.safeParse(contact);
    if (!validatedContact.success) {
      console.error('❌ Contact validation error:', validatedContact.error);
      return NextResponse.json(
        { error: 'Contact invalide', details: validatedContact.error.issues },
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

    // Ajouter le contact via RPC
    const { data: updatedContacts, error: rpcError } = await supabase
      .rpc('add_entity_contact', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_contact: validatedContact.data,
      });

    if (rpcError) {
      console.error('❌ RPC error:', rpcError);

      // Gérer les erreurs spécifiques
      if (rpcError.message?.includes('not found')) {
        return NextResponse.json(
          { error: `${entityType === 'product' ? 'Produit' : 'Marque'} non trouvé(e)` },
          { status: 404 }
        );
      }
      if (rpcError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'Ce contact existe déjà (même email ou nom)' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout du contact', details: rpcError.message },
        { status: 500 }
      );
    }

    console.log('✅ Contact added successfully. Total contacts:', Array.isArray(updatedContacts) ? updatedContacts.length : 0);

    return NextResponse.json({
      success: true,
      contacts: updatedContacts,
      message: 'Contact ajouté avec succès',
    });
  } catch (error) {
    console.error('❌ Error in POST /api/contacts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/contacts
 * Met à jour un contact existant d'un produit ou d'une marque
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId, contactIndex, contact } = body;

    console.log('✏️ PUT /api/contacts - Received:', { entityType, entityId, contactIndex, contact });

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

    if (typeof contactIndex !== 'number' || contactIndex < 0) {
      return NextResponse.json(
        { error: 'contactIndex invalide' },
        { status: 400 }
      );
    }

    // Valider le contact avec Zod
    const validatedContact = contactSchema.safeParse(contact);
    if (!validatedContact.success) {
      console.error('❌ Contact validation error:', validatedContact.error);
      return NextResponse.json(
        { error: 'Contact invalide', details: validatedContact.error.issues },
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

    // D'abord, récupérer les contacts existants via RPC
    const { data: entityData, error: fetchError } = await supabase
      .rpc('get_entity_contacts', {
        p_entity_type: entityType,
        p_entity_id: entityId,
      });

    if (fetchError || !entityData) {
      console.error('❌ Fetch error:', fetchError);
      return NextResponse.json(
        { error: `${entityType === 'product' ? 'Produit' : 'Marque'} non trouvé(e)` },
        { status: 404 }
      );
    }

    const existingContacts = entityData.contacts || [];

    // Vérifier que l'index est valide
    if (contactIndex >= existingContacts.length) {
      return NextResponse.json(
        { error: 'Index de contact hors limites' },
        { status: 400 }
      );
    }

    // Remplacer le contact à l'index spécifié
    const updatedContactsList = [...existingContacts];
    updatedContactsList[contactIndex] = validatedContact.data;

    // Mettre à jour tous les contacts via RPC
    const { data: updatedContacts, error: updateError } = await supabase
      .rpc('update_entity_contacts', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_contacts: updatedContactsList,
      });

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Contact updated successfully at index:', contactIndex);

    return NextResponse.json({
      success: true,
      contacts: updatedContacts,
      message: 'Contact mis à jour avec succès',
    });
  } catch (error) {
    console.error('❌ Error in PUT /api/contacts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts
 * Supprime un contact d'un produit ou d'une marque
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const contactIndex = parseInt(searchParams.get('contactIndex') || '-1', 10);

    console.log('🗑️ DELETE /api/contacts - Received:', { entityType, entityId, contactIndex });

    // Validation
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

    if (contactIndex < 0) {
      return NextResponse.json(
        { error: 'contactIndex invalide' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Supprimer le contact via RPC
    const { data: updatedContacts, error: rpcError } = await supabase
      .rpc('delete_entity_contact', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_contact_index: contactIndex,
      });

    if (rpcError) {
      console.error('❌ RPC error:', rpcError);

      if (rpcError.message?.includes('not found')) {
        return NextResponse.json(
          { error: `${entityType === 'product' ? 'Produit' : 'Marque'} non trouvé(e)` },
          { status: 404 }
        );
      }
      if (rpcError.message?.includes('out of bounds')) {
        return NextResponse.json(
          { error: 'Index de contact hors limites' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Erreur lors de la suppression', details: rpcError.message },
        { status: 500 }
      );
    }

    console.log('✅ Contact deleted. Remaining contacts:', Array.isArray(updatedContacts) ? updatedContacts.length : 0);

    return NextResponse.json({
      success: true,
      contacts: updatedContacts,
      message: 'Contact supprimé',
    });
  } catch (error) {
    console.error('❌ Error in DELETE /api/contacts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
