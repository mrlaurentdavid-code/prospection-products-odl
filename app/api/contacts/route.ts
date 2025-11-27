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

    // Récupérer l'entité et ses contacts actuels
    const tableName = entityType === 'product' ? 'prospection.products' : 'prospection.brands';

    const { data: entity, error: fetchError } = await supabase
      .from(tableName)
      .select('id, contacts')
      .eq('id', entityId)
      .single();

    if (fetchError || !entity) {
      console.error('❌ Entity not found:', fetchError);
      return NextResponse.json(
        { error: `${entityType === 'product' ? 'Produit' : 'Marque'} non trouvé(e)` },
        { status: 404 }
      );
    }

    // Ajouter le nouveau contact à la liste existante
    const existingContacts = Array.isArray(entity.contacts) ? entity.contacts : [];

    // Vérifier les doublons (par email ou nom)
    const isDuplicate = existingContacts.some((c: any) =>
      (c.email && validatedContact.data.email && c.email.toLowerCase() === validatedContact.data.email.toLowerCase()) ||
      (c.name && validatedContact.data.name && c.name.toLowerCase() === validatedContact.data.name.toLowerCase())
    );

    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Ce contact existe déjà (même email ou nom)' },
        { status: 409 }
      );
    }

    const updatedContacts = [...existingContacts, validatedContact.data];

    // Mettre à jour l'entité avec les nouveaux contacts
    const { data: updatedEntity, error: updateError } = await supabase
      .from(tableName)
      .update({ contacts: updatedContacts })
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

    console.log('✅ Contact added successfully. Total contacts:', updatedContacts.length);

    return NextResponse.json({
      success: true,
      contacts: updatedEntity.contacts,
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

    // Récupérer l'entité
    const tableName = entityType === 'product' ? 'prospection.products' : 'prospection.brands';

    const { data: entity, error: fetchError } = await supabase
      .from(tableName)
      .select('id, contacts')
      .eq('id', entityId)
      .single();

    if (fetchError || !entity) {
      return NextResponse.json(
        { error: `${entityType === 'product' ? 'Produit' : 'Marque'} non trouvé(e)` },
        { status: 404 }
      );
    }

    const existingContacts = Array.isArray(entity.contacts) ? entity.contacts : [];

    if (contactIndex >= existingContacts.length) {
      return NextResponse.json(
        { error: 'Index de contact hors limites' },
        { status: 400 }
      );
    }

    // Supprimer le contact
    const updatedContacts = existingContacts.filter((_, idx) => idx !== contactIndex);

    const { data: updatedEntity, error: updateError } = await supabase
      .from(tableName)
      .update({ contacts: updatedContacts })
      .eq('id', entityId)
      .select('contacts')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Contact deleted. Remaining contacts:', updatedContacts.length);

    return NextResponse.json({
      success: true,
      contacts: updatedEntity.contacts,
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
