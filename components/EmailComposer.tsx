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
  id: number;
  name: string;
  type: string;
  subject: string;
  body_html: string;
  language: string;
}

export function EmailComposer({
  open,
  onClose,
  contact,
  productName,
  productCategory,
  companyName,
  productId,
}: EmailComposerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string; title: string } | null>(null);

  // Charger les templates depuis la BDD et le profil utilisateur au montage
  useEffect(() => {
    async function loadData() {
      try {
        // Charger les templates
        const templatesResponse = await fetch('/api/email/templates');
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json();
          setTemplates(templatesData.templates || []);

          // Sélectionner le premier template "first_contact" en anglais par défaut
          const defaultTemplate = templatesData.templates?.find(
            (t: EmailTemplate) => t.type === 'first_contact' && t.language === 'en'
          );
          if (defaultTemplate) {
            setSelectedTemplateId(defaultTemplate.id);
          }
        }

        // Charger le profil utilisateur
        const profileResponse = await fetch('/api/settings/profile');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setUserProfile(profileData.profile);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        // Fallback sur des valeurs par défaut
        setUserProfile({ first_name: 'Prénom', last_name: 'Nom', title: 'Product Sourcing Manager' });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Extraire le prénom du contact (prendre le premier mot du nom)
  const contactFirstName = contact.name?.split(' ')[0] || 'there';

  // Variables dynamiques
  const variables = {
    '{{contact_name}}': contactFirstName,
    '{{company_name}}': companyName || 'your company',
    '{{product_name}}': productName || 'your product',
    '{{product_category}}': productCategory || 'this category',
    '{{sender_name}}': userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'User',
    '{{sender_title}}': userProfile?.title || 'Product Sourcing Manager',
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
    if (!selectedTemplateId || !userProfile) return;

    const template = templates.find((t) => t.id === selectedTemplateId);
    if (template) {
      setSubject(replaceVariables(template.subject));
      setBody(replaceVariables(template.body_html));
    }
  }, [selectedTemplateId, templates, companyName, productName, productCategory, contactFirstName, userProfile]);

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
            {loading ? (
              <p className="text-sm text-gray-500">Chargement des templates...</p>
            ) : (
              <Select
                value={selectedTemplateId?.toString()}
                onValueChange={(value) => setSelectedTemplateId(parseInt(value))}
              >
                <SelectTrigger id="template">
                  <SelectValue placeholder="Sélectionner un template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name} ({template.language.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
