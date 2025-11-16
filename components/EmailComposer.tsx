"use client";

import { useState, useEffect } from 'react';
import { Contact } from '@/lib/utils/validators';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmailComposerProps {
  open: boolean;
  onClose: () => void;
  contact: Contact;
  productName: string;
  productCategory: string | null;
  companyName: string;
  productId: string; // NOUVEAU: ID du produit pour changer le statut
}

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'first_contact',
    name: '1er Contact',
    type: 'first_contact',
    subject: 'Partnership Opportunity with {{company_name}} for O!deal Marketplace',
    body: `Hi,

I hope this email finds you well.

My name is {{sender_name}}, and I'm the {{sender_title}} at O!deal, a Swiss marketplace connecting innovative brands with customers across Europe.

I recently came across your product "{{product_name}}" and was really impressed by what you've built. It perfectly aligns with what our customers in the {{product_category}} category are looking for.

We'd love to explore a potential partnership to feature your products on our platform. O!deal gives brands like yours access to:
• Thousands of active customers in Switzerland and Europe
• A simple, commission-based sales model (no upfront costs)
• Marketing support and dedicated account management

Would you be open to a quick 15-minute call to discuss this opportunity?

Looking forward to hearing from you.

Best regards,
{{sender_name}}
{{sender_title}}
O!deal Marketplace
https://odeal.ch`,
  },
  {
    id: 'followup_1',
    name: 'Relance 1',
    type: 'followup_1',
    subject: 'Following up - {{company_name}} x O!deal Partnership',
    body: `Hi,

I wanted to follow up on my previous email about featuring {{product_name}} on O!deal.

I understand you're busy, but I genuinely believe this could be a great opportunity for {{company_name}} to expand your reach in the Swiss and European markets.

Quick reminder of what we offer:
• Zero upfront costs - commission-based model only
• Access to thousands of active customers
• Full marketing and logistics support

If you're interested or have any questions, I'd be happy to send over more details or schedule a quick call at your convenience.

Thanks for your time!

Best,
{{sender_name}}
O!deal Marketplace`,
  },
  {
    id: 'blank',
    name: 'Vierge',
    type: 'custom',
    subject: '',
    body: '',
  },
];

export function EmailComposer({
  open,
  onClose,
  contact,
  productName,
  productCategory,
  companyName,
  productId,
}: EmailComposerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('first_contact');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  // Variables dynamiques
  const variables = {
    '{{company_name}}': companyName || 'your company',
    '{{product_name}}': productName || 'your product',
    '{{product_category}}': productCategory || 'this category',
    '{{sender_name}}': 'Laurent David', // À adapter selon l'utilisateur connecté
    '{{sender_title}}': 'Product Sourcing Manager',
  };

  // Remplace les variables dans le texte
  const replaceVariables = (text: string): string => {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    return result;
  };

  // Met à jour subject et body quand le template change
  useEffect(() => {
    const template = DEFAULT_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (template) {
      setSubject(replaceVariables(template.subject));
      setBody(replaceVariables(template.body));
    }
  }, [selectedTemplate, companyName, productName, productCategory]);

  const handleSend = async () => {
    if (!contact.email) {
      alert('Aucun email trouvé pour ce contact');
      return;
    }

    setSending(true);

    try {
      // Créer le lien mailto: avec sujet et corps
      const mailtoLink = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      console.log('📧 Opening email client for:', contact.email);

      // Ouvrir le client mail
      window.location.href = mailtoLink;

      // Petite pause pour laisser le client mail s'ouvrir
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Demander confirmation avant de changer le statut
      const confirmed = confirm(
        'Avez-vous envoyé l\'email ?\n\nCliquez OK pour marquer le produit comme "Contacté".\nCliquez Annuler si vous n\'avez pas envoyé l\'email.'
      );

      if (confirmed) {
        // 1. Enregistrer l'email envoyé dans la BDD
        console.log('📝 Logging email sent...');
        const logResponse = await fetch('/api/email/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId,
            toEmail: contact.email,
            subject,
            body,
            contactName: contact.name,
            contactTitle: contact.title || null,
          }),
        });

        if (!logResponse.ok) {
          console.error('Failed to log email');
        } else {
          console.log('✅ Email logged successfully');
        }

        // 2. Changer le statut du produit à "contacted"
        console.log('🔄 Updating product status to "contacted"...');
        const statusResponse = await fetch(`/api/products/${productId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'contacted' }),
        });

        if (!statusResponse.ok) {
          console.error('Failed to update product status');
          alert('Erreur lors de la mise à jour du statut');
        } else {
          console.log('✅ Product status updated to "contacted"');
        }

        onClose();

        // Rafraîchir la page pour voir le changement de statut
        window.location.reload();
      } else {
        console.log('ℹ️ User cancelled status update');
        onClose();
      }
    } catch (error) {
      console.error('Error opening email client:', error);
      alert('Erreur lors de l\'ouverture du client mail');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Composer un email</DialogTitle>
          <DialogDescription>
            Email à : <strong>{contact.email || 'Pas d\'email disponible'}</strong>
            {contact.name && ` (${contact.name})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sélection du template */}
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Sélectionner un template" />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sujet */}
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sujet de l'email"
            />
          </div>

          {/* Corps du message */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Corps de l'email"
              className="w-full min-h-[300px] p-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">
              Variables disponibles : {'{'}company_name{'}'}, {'{'}product_name{'}'}, {'{'}product_category{'}'}, {'{'}sender_name{'}'}, {'{'}sender_title{'}'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={!contact.email || sending}>
            {sending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
