import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/email/log
 * Enregistre un email envoyé dans la table email_logs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, toEmail, subject, body: emailBody, contactName, contactTitle } = body;

    console.log('📧 Logging email sent:', { productId, toEmail, contactName });

    // Validation
    if (!productId || !toEmail || !subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Vérifier l'authentification (optionnel pour le MVP)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('⚠️ No authenticated user, logging email anyway');
    }

    // Enregistrer l'email via RPC
    const { data, error } = await supabase.rpc('log_email_sent', {
      p_product_id: productId,
      p_to_email: toEmail,
      p_subject: subject,
      p_body: emailBody,
      p_contact_name: contactName || null,
      p_contact_title: contactTitle || null,
    });

    if (error) {
      console.error('❌ Error logging email:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Email logged successfully:', data);

    return NextResponse.json({
      success: true,
      logId: data,
    });
  } catch (error) {
    console.error('❌ Error in POST /api/email/log:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
