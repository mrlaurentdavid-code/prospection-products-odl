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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Type pour les contacts Lusha (résultat de recherche gratuit)
interface LushaSearchContact {
  contactId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle?: string;
  company?: string;
  country?: string;
  city?: string;
  linkedinUrl?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
}

interface LushaSearchModalProps {
  open: boolean;
  onClose: () => void;
  onContactsAdded: (contacts: any[]) => void;
  entityType: 'product' | 'brand';
  entityId: string;
  companyName: string;
  companyDomain?: string;
}

// Régions pour le filtre
const REGIONS = [
  { value: 'DACH', label: 'DACH (DE-AT-CH)' },
  { value: 'CH', label: 'Suisse' },
  { value: 'DE', label: 'Allemagne' },
  { value: 'AT', label: 'Autriche' },
  { value: 'FR', label: 'France' },
  { value: 'EU', label: 'Europe' },
  { value: 'ALL', label: 'Monde entier' },
];

export function LushaSearchModal({
  open,
  onClose,
  onContactsAdded,
  entityType,
  entityId,
  companyName,
  companyDomain,
}: LushaSearchModalProps) {
  // États
  const [step, setStep] = useState<'search' | 'select' | 'confirm' | 'result'>('search');
  const [region, setRegion] = useState('DACH');
  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Résultats de recherche
  const [searchResults, setSearchResults] = useState<LushaSearchContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [dataPoints, setDataPoints] = useState<{ email: boolean; phone: boolean }>({ email: true, phone: false });

  // Crédits
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [enrichedContacts, setEnrichedContacts] = useState<any[]>([]);

  // Calculer le coût total
  const selectedCount = selectedContacts.size;
  const creditsPerContact = (dataPoints.email ? 1 : 0) + (dataPoints.phone ? 1 : 0);
  const totalCredits = selectedCount * creditsPerContact;

  // Reset à la fermeture
  const handleClose = () => {
    setStep('search');
    setSearchResults([]);
    setSelectedContacts(new Set());
    setError(null);
    setEnrichedContacts([]);
    onClose();
  };

  // Étape 1: Recherche gratuite
  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/lusha/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyDomain,
          region,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la recherche');
      }

      const data = await response.json();
      setSearchResults(data.contacts || []);
      setCreditsRemaining(data.creditsRemaining);

      if (data.contacts?.length > 0) {
        setStep('select');
      } else {
        setError('Aucun contact trouvé pour cette entreprise');
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

  // Passer à la confirmation
  const handleProceedToConfirm = () => {
    if (selectedContacts.size === 0) {
      setError('Sélectionnez au moins un contact');
      return;
    }
    if (!dataPoints.email && !dataPoints.phone) {
      setError('Sélectionnez au moins un type de données');
      return;
    }
    setError(null);
    setStep('confirm');
  };

  // Étape 3: Enrichissement (payant)
  const handleEnrich = async () => {
    setIsEnriching(true);
    setError(null);

    try {
      const contactIds = Array.from(selectedContacts);
      const dataPointsList: string[] = [];
      if (dataPoints.email) dataPointsList.push('work_email');
      if (dataPoints.phone) dataPointsList.push('work_phone');

      const response = await fetch('/api/lusha/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds,
          dataPoints: dataPointsList,
          entityType,
          entityId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'enrichissement');
      }

      const data = await response.json();
      setEnrichedContacts(data.contacts || []);
      setCreditsRemaining(data.creditsRemaining);

      // Notifier le parent des nouveaux contacts
      if (data.contacts?.length > 0) {
        onContactsAdded(data.contacts);
      }

      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enrichissement');
    } finally {
      setIsEnriching(false);
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">🔮</span>
            Recherche Lusha - {companyName}
          </DialogTitle>
          <DialogDescription>
            {step === 'search' && 'Recherchez des contacts qualifiés dans cette entreprise'}
            {step === 'select' && 'Sélectionnez les contacts à enrichir (la recherche est gratuite)'}
            {step === 'confirm' && 'Confirmez votre sélection avant enrichissement'}
            {step === 'result' && 'Contacts enrichis avec succès'}
          </DialogDescription>
        </DialogHeader>

        {/* Crédits restants */}
        {creditsRemaining !== null && (
          <div className="flex justify-end">
            <Badge variant="outline" className="text-xs">
              Crédits restants: {creditsRemaining}
            </Badge>
          </div>
        )}

        {/* Contenu selon l'étape */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* ÉTAPE 1: Recherche */}
          {step === 'search' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Région cible</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-sm">
                <p className="font-medium text-blue-800 mb-2">Comment ça marche ?</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li><strong>Recherche gratuite</strong> - Voir les contacts disponibles</li>
                  <li><strong>Sélection</strong> - Choisir les contacts pertinents</li>
                  <li><strong>Enrichissement</strong> - Révéler email/téléphone (1-2 crédits/contact)</li>
                </ol>
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
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {sortedResults.map((contact) => {
                  const relevance = getTitleRelevanceScore(contact.jobTitle);
                  const isSelected = selectedContacts.has(contact.contactId);

                  return (
                    <div
                      key={contact.contactId}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleContact(contact.contactId)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleContact(contact.contactId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{contact.fullName}</span>
                            <Badge className={`text-xs ${relevance.color}`}>{relevance.label}</Badge>
                          </div>
                          {contact.jobTitle && (
                            <p className="text-sm text-gray-600 mt-0.5">{contact.jobTitle}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {contact.country && <span>📍 {contact.country}</span>}
                            {contact.linkedinUrl && <span>🔗 LinkedIn</span>}
                            {contact.hasEmail && <span className="text-green-600">✓ Email dispo</span>}
                            {contact.hasPhone && <span className="text-green-600">✓ Tel dispo</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Options de données */}
              <div className="pt-4 border-t space-y-3">
                <Label>Données à révéler :</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={dataPoints.email}
                      onCheckedChange={(checked) => setDataPoints(prev => ({ ...prev, email: !!checked }))}
                    />
                    <span className="text-sm">Email professionnel (1 crédit)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={dataPoints.phone}
                      onCheckedChange={(checked) => setDataPoints(prev => ({ ...prev, phone: !!checked }))}
                    />
                    <span className="text-sm">Téléphone (+1 crédit)</span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
              )}
            </div>
          )}

          {/* ÉTAPE 3: Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="font-medium text-amber-800 mb-3">Récapitulatif de votre commande</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Contacts sélectionnés</span>
                    <span className="font-medium">{selectedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Données demandées</span>
                    <span>
                      {[dataPoints.email && 'Email', dataPoints.phone && 'Téléphone'].filter(Boolean).join(' + ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coût par contact</span>
                    <span>{creditsPerContact} crédit(s)</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-amber-300 font-bold text-amber-900">
                    <span>TOTAL</span>
                    <span>{totalCredits} crédits</span>
                  </div>
                </div>
              </div>

              {/* Liste des contacts sélectionnés */}
              <div className="space-y-2">
                <Label>Contacts à enrichir :</Label>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {sortedResults
                    .filter(c => selectedContacts.has(c.contactId))
                    .map(contact => (
                      <div key={contact.contactId} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                        <span className="font-medium">{contact.fullName}</span>
                        {contact.jobTitle && <span className="text-gray-500">- {contact.jobTitle}</span>}
                      </div>
                    ))}
                </div>
              </div>

              {creditsRemaining !== null && totalCredits > creditsRemaining && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                  Attention: Vous n'avez que {creditsRemaining} crédits disponibles
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
              )}
            </div>
          )}

          {/* ÉTAPE 4: Résultat */}
          {step === 'result' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="font-medium text-green-800 mb-2">
                  ✅ {enrichedContacts.length} contact(s) enrichi(s) avec succès !
                </p>
                <p className="text-sm text-green-700">
                  Les contacts ont été ajoutés à votre liste.
                </p>
              </div>

              <div className="space-y-2">
                {enrichedContacts.map((contact, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <p className="font-medium">{contact.name}</p>
                    {contact.title && <p className="text-sm text-gray-600">{contact.title}</p>}
                    <div className="mt-2 space-y-1 text-sm">
                      {contact.email && (
                        <p className="text-blue-600">📧 {contact.email}</p>
                      )}
                      {contact.phone && (
                        <p className="text-gray-700">📞 {contact.phone}</p>
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
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? '🔄 Recherche...' : '🔍 Rechercher'}
              </Button>
            </>
          )}

          {step === 'select' && (
            <>
              <Button variant="outline" onClick={() => setStep('search')}>Retour</Button>
              <Button onClick={handleProceedToConfirm} disabled={selectedContacts.size === 0}>
                Continuer ({selectedCount} sélectionné{selectedCount > 1 ? 's' : ''})
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>Retour</Button>
              <Button
                onClick={handleEnrich}
                disabled={isEnriching || (creditsRemaining !== null && totalCredits > creditsRemaining)}
              >
                {isEnriching ? '🔄 Enrichissement...' : `💳 Confirmer (${totalCredits} crédits)`}
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button onClick={handleClose}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
