import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const LUSHA_API_BASE = 'https://api.lusha.com';

/**
 * POST /api/lusha/enrich
 * Enrichissement PAYANT de contacts Lusha (consomme des crédits)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactIds, dataPoints, entityType, entityId } = body;

    console.log('💳 Lusha Enrich API:', { contactIds, dataPoints, entityType, entityId });

    // Validation
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'contactIds requis' }, { status: 400 });
    }
    if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length === 0) {
      return NextResponse.json({ error: 'dataPoints requis' }, { status: 400 });
    }
    if (!entityType || !['product', 'brand'].includes(entityType)) {
      return NextResponse.json({ error: 'entityType invalide' }, { status: 400 });
    }
    if (!entityId) {
      return NextResponse.json({ error: 'entityId requis' }, { status: 400 });
    }

    // Vérifier l'authentification
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier la clé API Lusha
    const apiKey = process.env.LUSHA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Lusha API non configurée' }, { status: 500 });
    }

    // Appeler l'API Lusha pour enrichir
    console.log(`🔄 Enriching ${contactIds.length} contact(s) with dataPoints:`, dataPoints);

    const enrichResponse = await fetch(`${LUSHA_API_BASE}/prospecting/contact/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      body: JSON.stringify({
        contactIds,
        dataPoints, // ['work_email', 'work_phone']
      }),
    });

    if (!enrichResponse.ok) {
      const errorText = await enrichResponse.text();
      console.error(`❌ Lusha Enrich API error (${enrichResponse.status}):`, errorText);

      if (enrichResponse.status === 402) {
        return NextResponse.json({ error: 'Crédits Lusha insuffisants' }, { status: 402 });
      }

      return NextResponse.json(
        { error: `Erreur Lusha: ${enrichResponse.status}` },
        { status: enrichResponse.status }
      );
    }

    const enrichData = await enrichResponse.json();
    console.log(`✅ Lusha enriched ${enrichData.data?.length || 0} contacts`);

    // Convertir en format Contact
    const enrichedContacts = (enrichData.data || []).map((c: any) => {
      const workEmail = c.emails?.find((e: any) => e.type === 'work')?.email || c.emails?.[0]?.email || null;
      const workPhone = c.phones?.find((p: any) => p.type === 'work' || p.type === 'direct')?.number || c.phones?.[0]?.number || null;
      const location = c.city && c.country ? `${c.city}, ${c.country}` : c.country || null;

      return {
        name: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        title: c.jobTitle || null,
        email: workEmail,
        phone: workPhone,
        linkedin_url: c.linkedinUrl || null,
        location,
        source: 'lusha',
        confidence: workEmail ? 0.9 : 0.7,
      };
    }).filter((c: any) => c.name); // Filtrer les contacts sans nom

    // Ajouter les contacts à l'entité
    if (enrichedContacts.length > 0) {
      for (const contact of enrichedContacts) {
        try {
          await supabase.rpc('add_entity_contact', {
            p_entity_type: entityType,
            p_entity_id: entityId,
            p_contact: contact,
          });
          console.log(`✅ Added contact: ${contact.name}`);
        } catch (err) {
          console.error(`❌ Failed to add contact ${contact.name}:`, err);
        }
      }
    }

    // Récupérer les crédits restants
    let creditsRemaining = null;
    try {
      const creditsResponse = await fetch(`${LUSHA_API_BASE}/credits`, {
        method: 'GET',
        headers: { 'api_key': apiKey },
      });
      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json();
        creditsRemaining = creditsData.remaining;
      }
    } catch (e) {
      console.error('Failed to get Lusha credits:', e);
    }

    // Récupérer la liste mise à jour des contacts
    const { data: updatedEntity } = await supabase.rpc('get_entity_contacts', {
      p_entity_type: entityType,
      p_entity_id: entityId,
    });

    return NextResponse.json({
      success: true,
      contacts: enrichedContacts,
      allContacts: updatedEntity?.contacts || [],
      creditsRemaining,
      creditsUsed: contactIds.length * dataPoints.length,
    });

  } catch (error) {
    console.error('❌ Lusha enrich error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
