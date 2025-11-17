import { createClient } from '@/lib/supabase/server';
import { EmailTemplate } from '@/lib/supabase/types';
import { notFound } from 'next/navigation';
import { TemplateEditor } from '@/components/TemplateEditor';

interface TemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: template, error } = await supabase
    .rpc('get_email_template_by_id', { p_template_id: parseInt(id) }) as { data: EmailTemplate | null; error: any };

  if (error || !template) {
    console.error('Error fetching template:', error);
    return notFound();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <TemplateEditor template={template} />
    </div>
  );
}
