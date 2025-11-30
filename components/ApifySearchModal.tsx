"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

// Type pour les contacts Apify (résultat de recherche LinkedIn)
interface ApifySearchContact {
  contactId: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  jobTitle?: string;
  company?: string;
  companyDomain?: string;
  country?: string;
  city?: string;
  location?: string;
  linkedinUrl?: string;
  profileImageUrl?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasLocation?: boolean;
  hasLinkedin?: boolean;
  email?: string;
  source?: string;
}

interface ApifySearchModalProps {
  open: boolean;
  onClose: () => void;
  onContactsAdded: (contacts: any[]) => void;
  entityType: 'product' | 'brand';
  entityId: string;
  companyName: string;
  companyDomain?: string;
  brandName?: string;
  companyLinkedInUrl?: string; // URL LinkedIn de l'entreprise si connue
}

export function ApifySearchModal({
  open,
  onClose,
  onContactsAdded,
  entityType,
  entityId,
  companyName,
  companyDomain,
  brandName,
  companyLinkedInUrl,
}: ApifySearchModalProps) {
  // États
  const [step, setStep] = useState<'search' | 'select' | 'saving'>('search');
  const [searchQuery, setSearchQuery] = useState(''); // Nom d'entreprise ou URL LinkedIn
  const [linkedInUrl, setLinkedInUrl] = useState(companyLinkedInUrl || ''); // URL LinkedIn
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Résultats de recherche
  const [searchResults, setSearchResults] = useState<ApifySearchContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [savedContacts, setSavedContacts] = useState<any[]>([]);

  // Reset à la fermeture
  const handleClose = () => {
    setStep('search');
    setSearchQuery('');
    setLinkedInUrl(companyLinkedInUrl || '');
    setSearchResults([]);
    setSelectedContacts(new Set());
    setError(null);
    setSavedContacts([]);
    onClose();
  };

  // Suggestions de recherche
  const searchSuggestions = [
    brandName && `${brandName}`,
    brandName && `${brandName} Innovations`,
    companyName !== brandName ? companyName : null,
  ].filter((s, idx, arr): s is string => !!s && arr.indexOf(s) === idx);

  // Recherche via Apify
  const handleSearch = async () => {
    const queryToSearch = searchQuery.trim() || linkedInUrl.trim();
    if (!queryToSearch) {
      setError('Veuillez entrer un nom d\'entreprise ou une URL LinkedIn');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Déterminer si c'est une URL LinkedIn ou un nom d'entreprise
      const isLinkedInUrl = queryToSearch.includes('linkedin.com/company/');

      const response = await fetch('/api/apify/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: isLinkedInUrl ? undefined : queryToSearch,
          companyDomain,
          companyLinkedInUrl: isLinkedInUrl ? queryToSearch : linkedInUrl || undefined,
          maxResults: 50,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la recherche');
      }

      const data = await response.json();
      setSearchResults(data.contacts || []);

      if (data.contacts?.length > 0) {
        setStep('select');
      } else {
        setError(data.error || 'Aucun contact trouvé. Vérifiez le nom ou l\'URL LinkedIn de l\'entreprise.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche');
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle sélection d'un contact
  const toggleContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  // Sélectionner/Désélectionner tous
  const toggleAll = () => {
    if (selectedContacts.size === searchResults.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(searchResults.map(c => c.contactId)));
    }
  };

  // Sauvegarder les contacts sélectionnés
  const handleSaveContacts = async () => {
    if (selectedContacts.size === 0) {
      setError('Sélectionnez au moins un contact');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Filtrer les contacts sélectionnés
      const contactsToSave = searchResults
        .filter(c => selectedContacts.has(c.contactId))
        .map(c => ({
          name: c.fullName,
          title: c.jobTitle,
          location: c.location || [c.city, c.country].filter(Boolean).join(', '),
          linkedin_url: c.linkedinUrl,
          email: c.email,
          source: 'apify',
        }));

      // Appeler l'API contacts pour sauvegarder
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          contacts: contactsToSave,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      const data = await response.json();
      setSavedContacts(contactsToSave);

      // Notifier le parent
      onContactsAdded(contactsToSave);

      setStep('saving');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Score visuel pour le titre (pertinence commerciale)
  const getTitleRelevanceScore = (title?: string): { score: number; label: string; color: string } => {
    if (!title) return { score: 0, label: 'Inconnu', color: 'bg-gray-100 text-gray-600' };

    const titleLower = title.toLowerCase();

    // Très pertinent (commerciaux, export, DACH)
    if (titleLower.includes('dach') || titleLower.includes('switzerland') || titleLower.includes('export')) {
      return { score: 100, label: 'Excellent', color: 'bg-green-100 text-green-800' };
    }
    if (titleLower.includes('sales director') || titleLower.includes('commercial director') || titleLower.includes('country manager')) {
      return { score: 90, label: 'Excellent', color: 'bg-green-100 text-green-800' };
    }
    if (titleLower.includes('business development') || titleLower.includes('key account')) {
      return { score: 80, label: 'Tres bon', color: 'bg-emerald-100 text-emerald-800' };
    }
    if (titleLower.includes('sales manager') || titleLower.includes('regional')) {
      return { score: 70, label: 'Bon', color: 'bg-blue-100 text-blue-800' };
    }
    if (titleLower.includes('sales') || titleLower.includes('commercial') || titleLower.includes('account')) {
      return { score: 60, label: 'Pertinent', color: 'bg-blue-100 text-blue-700' };
    }
    if (titleLower.includes('marketing') || titleLower.includes('partnership')) {
      return { score: 50, label: 'Possible', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (titleLower.includes('ceo') || titleLower.includes('founder') || titleLower.includes('owner') || titleLower.includes('director')) {
      return { score: 45, label: 'Decideur', color: 'bg-purple-100 text-purple-800' };
    }

    return { score: 20, label: 'Autre', color: 'bg-gray-100 text-gray-600' };
  };

  // Trier les résultats par pertinence
  const sortedResults = [...searchResults].sort((a, b) => {
    const scoreA = getTitleRelevanceScore(a.jobTitle).score;
    const scoreB = getTitleRelevanceScore(b.jobTitle).score;
    return scoreB - scoreA;
  });

  const selectedCount = selectedContacts.size;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">🐝</span>
            Recherche Apify (LinkedIn) - {companyName}
          </DialogTitle>
          <DialogDescription>
            {step === 'search' && 'Recherchez des employés via LinkedIn (scraping Apify)'}
            {step === 'select' && 'Sélectionnez les contacts à ajouter'}
            {step === 'saving' && 'Contacts ajoutés avec succès'}
          </DialogDescription>
        </DialogHeader>

        {/* Info Apify */}
        <div className="bg-amber-50 text-amber-800 px-3 py-2 rounded text-xs flex items-center gap-2">
          <span>💡</span>
          <span>Apify utilise le scraping LinkedIn - données directes sans crédits par contact</span>
        </div>

        {/* Contenu selon l'étape */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* ÉTAPE 1: Recherche */}
          {step === 'search' && (
            <div className="space-y-4">
              {/* Champ de recherche entreprise */}
              <div className="space-y-2">
                <Label htmlFor="search-query">Nom de l'entreprise</Label>
                <input
                  id="search-query"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Anker Innovations"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              {/* Suggestions rapides */}
              {searchSuggestions.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Suggestions :</Label>
                  <div className="flex flex-wrap gap-2">
                    {searchSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSearchQuery(suggestion)}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                          searchQuery === suggestion
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* URL LinkedIn optionnelle */}
              <div className="space-y-2">
                <Label htmlFor="linkedin-url">URL LinkedIn de l'entreprise (optionnel)</Label>
                <input
                  id="linkedin-url"
                  type="text"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="Ex: https://www.linkedin.com/company/anker-innovations"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500">
                  Plus fiable si vous avez l'URL exacte LinkedIn de l'entreprise
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg text-sm">
                <p className="font-medium text-green-800 mb-2">Avantages Apify vs Lusha</p>
                <ul className="list-disc list-inside space-y-1 text-green-700">
                  <li><strong>Pas de crédits</strong> - Coût fixe par recherche</li>
                  <li><strong>Localisation visible</strong> - Données LinkedIn directes</li>
                  <li><strong>Plus de résultats</strong> - Pas de limite stricte</li>
                  <li><strong>URLs LinkedIn</strong> - Accès direct aux profils</li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
              )}
            </div>
          )}

          {/* ÉTAPE 2: Sélection des contacts */}
          {step === 'select' && (
            <div className="space-y-4">
              {/* Header avec compteur et toggle all */}
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedContacts.size === searchResults.length && searchResults.length > 0}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm text-gray-600">
                    {selectedContacts.size} / {searchResults.length} sélectionné(s)
                  </span>
                </div>
                <Badge variant="secondary">{searchResults.length} contacts trouvés</Badge>
              </div>

              {/* Liste des contacts */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {sortedResults.map((contact) => {
                  const relevance = getTitleRelevanceScore(contact.jobTitle);
                  const isSelected = selectedContacts.has(contact.contactId);
                  const location = contact.location || [contact.city, contact.country].filter(Boolean).join(', ');

                  return (
                    <div
                      key={contact.contactId}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => toggleContact(contact.contactId)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleContact(contact.contactId)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          {/* Ligne 1: Nom + Badge pertinence */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{contact.fullName}</span>
                            <Badge className={`text-xs ${relevance.color}`}>{relevance.label}</Badge>
                          </div>

                          {/* Ligne 2: Poste */}
                          {contact.jobTitle && (
                            <p className="text-sm font-medium text-gray-700 mt-1">{contact.jobTitle}</p>
                          )}

                          {/* Ligne 3: Entreprise */}
                          {contact.company && (
                            <p className="text-sm text-gray-600 mt-0.5">
                              <span className="text-gray-400">@</span> {contact.company}
                            </p>
                          )}

                          {/* Ligne 4: Infos supplémentaires */}
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            {location && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                📍 {location}
                              </span>
                            )}
                            {contact.linkedinUrl && (
                              <a
                                href={contact.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100"
                              >
                                🔗 LinkedIn
                              </a>
                            )}
                            {contact.email && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                                📧 {contact.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
              )}
            </div>
          )}

          {/* ÉTAPE 3: Résultat */}
          {step === 'saving' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="font-medium text-green-800 mb-2">
                  ✅ {savedContacts.length} contact(s) ajouté(s) avec succès !
                </p>
                <p className="text-sm text-green-700">
                  Les contacts ont été ajoutés à votre liste.
                </p>
              </div>

              <div className="space-y-2">
                {savedContacts.map((contact, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <p className="font-medium">{contact.name}</p>
                    {contact.title && <p className="text-sm text-gray-600">{contact.title}</p>}
                    <div className="mt-2 space-y-1 text-sm">
                      {contact.email && (
                        <p className="text-blue-600">📧 {contact.email}</p>
                      )}
                      {contact.linkedin_url && (
                        <p>
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            🔗 LinkedIn
                          </a>
                        </p>
                      )}
                      {contact.location && (
                        <p className="text-gray-500">📍 {contact.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer avec actions */}
        <DialogFooter className="border-t pt-4">
          {step === 'search' && (
            <>
              <Button variant="outline" onClick={handleClose}>Annuler</Button>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSearching ? '🔄 Recherche...' : '🔍 Rechercher sur LinkedIn'}
              </Button>
            </>
          )}

          {step === 'select' && (
            <>
              <Button variant="outline" onClick={() => setStep('search')}>Retour</Button>
              <Button
                onClick={handleSaveContacts}
                disabled={selectedContacts.size === 0 || isSaving}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSaving ? '🔄 Sauvegarde...' : `✅ Ajouter ${selectedCount} contact(s)`}
              </Button>
            </>
          )}

          {step === 'saving' && (
            <Button onClick={handleClose}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
