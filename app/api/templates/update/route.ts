import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateTemplateSchema = z.object({
  template_id: z.number(),
  subject: z.string(),
  body_html: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_id, subject, body_html } = updateTemplateSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase.rpc('update_email_template', {
      p_template_id: template_id,
      p_subject: subject,
      p_body_html: body_html,
    });

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template: data,
    });
  } catch (error) {
    console.error('Error in update template API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
