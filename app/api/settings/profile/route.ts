import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Récupérer ou créer le profil utilisateur
    const { data: profile, error } = await supabase.rpc('get_or_create_user_profile');

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: profile?.[0] || null,
    });
  } catch (error) {
    console.error('Error in GET /api/settings/profile:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { first_name, last_name, title, email, phone, signature } = body;

    // Validation
    if (!first_name || !last_name || !title) {
      return NextResponse.json(
        { success: false, error: 'Prénom, nom et titre requis' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Mettre à jour le profil via RPC
    const { data, error } = await supabase.rpc('update_user_profile', {
      p_first_name: first_name,
      p_last_name: last_name,
      p_title: title,
      p_email: email || null,
      p_phone: phone || null,
      p_signature: signature || null,
    });

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profil mis à jour avec succès',
    });
  } catch (error) {
    console.error('Error in POST /api/settings/profile:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
