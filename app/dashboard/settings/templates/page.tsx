'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  Search,
  Eye,
  Pencil,
  X,
} from 'lucide-react'
import type { OrgType, PitchType } from '@/lib/supabase/types'

interface EmailTemplate {
  id: string
  name: string
  type: string
  org_type: OrgType | null
  pitch_type: PitchType | null
  language: string
  subject: string
  body: string
  variables: string[]
  is_active: boolean
}

const TYPE_LABELS: Record<string, string> = {
  first_contact: 'Premier contact',
  pre_launch: 'Pré-lancement',
  pre_register: 'Pré-inscription',
  followup_1: 'Relance 1',
  followup_2: 'Relance 2',
  followup_3: 'Relance 3',
}

const TYPE_COLORS: Record<string, string> = {
  first_contact: 'bg-blue-100 text-blue-700',
  pre_launch: 'bg-purple-100 text-purple-700',
  pre_register: 'bg-emerald-100 text-emerald-700',
  followup_1: 'bg-orange-100 text-orange-700',
  followup_2: 'bg-amber-100 text-amber-700',
  followup_3: 'bg-red-100 text-red-700',
}

const ORG_LABELS: Record<string, string> = {
  BRAND_OWNER: 'Marque',
  DISTRIBUTOR: 'Distributeur',
  SERVICE_PROVIDER: 'Prestataire',
}

const PITCH_LABELS: Record<string, string> = {
  ODEAL: 'O!deal',
  SECRETDROP: 'SecretDrop',
  BOTH: 'Les deux',
}

const LANG_LABELS: Record<string, string> = {
  en: 'EN',
  fr: 'FR',
  de: 'DE',
  it: 'IT',
}

const LANG_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
}

export default function SettingsTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [orgFilter, setOrgFilter] = useState<string>('all')
  const [pitchFilter, setPitchFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [langFilter, setLangFilter] = useState<string>('all')

  // Expanded / editing state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/templates')
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()
      setTemplates(data.templates)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const startEdit = (tpl: EmailTemplate) => {
    setEditingId(tpl.id)
    setEditSubject(tpl.subject)
    setEditBody(tpl.body)
    setExpandedId(tpl.id)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditSubject('')
    setEditBody('')
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          subject: editSubject,
          body: editBody,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      const updated = await res.json()
      setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
      setEditingId(null)
      setSavedId(updated.id)
      setTimeout(() => setSavedId(null), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Filter templates
  const filtered = templates.filter(tpl => {
    if (orgFilter !== 'all' && tpl.org_type !== orgFilter) return false
    if (pitchFilter !== 'all' && tpl.pitch_type !== pitchFilter) return false
    if (typeFilter !== 'all' && tpl.type !== typeFilter) return false
    if (langFilter !== 'all' && tpl.language !== langFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.subject.toLowerCase().includes(q) ||
        tpl.body.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Group by org_type + pitch_type
  const grouped = filtered.reduce<Record<string, EmailTemplate[]>>((acc, tpl) => {
    const key = `${tpl.org_type || 'GENERIC'}_${tpl.pitch_type || 'ALL'}`
    if (!acc[key]) acc[key] = []
    acc[key].push(tpl)
    return acc
  }, {})

  // Available languages in dataset
  const availableLangs = [...new Set(templates.map(t => t.language))].sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchTemplates}>
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les modèles..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Cible" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes cibles</SelectItem>
              <SelectItem value="BRAND_OWNER">Marques</SelectItem>
              <SelectItem value="DISTRIBUTOR">Distributeurs</SelectItem>
              <SelectItem value="SERVICE_PROVIDER">Prestataires</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pitchFilter} onValueChange={setPitchFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Pitch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous pitchs</SelectItem>
              <SelectItem value="ODEAL">O!deal</SelectItem>
              <SelectItem value="SECRETDROP">SecretDrop</SelectItem>
              <SelectItem value="BOTH">Les deux</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="first_contact">Premier contact</SelectItem>
              <SelectItem value="pre_launch">Pré-lancement</SelectItem>
              <SelectItem value="pre_register">Pré-inscription</SelectItem>
              <SelectItem value="followup_1">Relance 1</SelectItem>
              <SelectItem value="followup_2">Relance 2</SelectItem>
              <SelectItem value="followup_3">Relance 3</SelectItem>
            </SelectContent>
          </Select>

          <Select value={langFilter} onValueChange={setLangFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Langue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes langues</SelectItem>
              {availableLangs.map(l => (
                <SelectItem key={l} value={l}>
                  {LANG_FLAGS[l] || ''} {LANG_LABELS[l] || l.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} modèle{filtered.length !== 1 ? 's' : ''} sur {templates.length}
      </p>

      {/* Template list */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">Aucun modèle ne correspond aux filtres.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupKey, groupTemplates]) => {
            const [orgType, pitchType] = groupKey.split('_')
            const orgLabel = ORG_LABELS[orgType] || 'Générique'
            const pitchLabel = PITCH_LABELS[pitchType] || 'Tous'

            return (
              <div key={groupKey} className="space-y-2">
                {/* Group header */}
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-1">
                  <span>{orgLabel}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{pitchLabel}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-xs">{groupTemplates.length} modèle{groupTemplates.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Templates in this group */}
                <div className="space-y-2">
                  {groupTemplates.map(tpl => {
                    const isExpanded = expandedId === tpl.id
                    const isEditing = editingId === tpl.id
                    const justSaved = savedId === tpl.id

                    return (
                      <Card key={tpl.id} className={`overflow-hidden transition-shadow ${isExpanded ? 'shadow-md' : ''}`}>
                        {/* Header row - always visible */}
                        <button
                          onClick={() => {
                            if (isEditing) return
                            setExpandedId(isExpanded ? null : tpl.id)
                          }}
                          className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 text-left hover:bg-muted/30 transition-colors"
                        >
                          <Badge className={`${TYPE_COLORS[tpl.type] || 'bg-gray-100 text-gray-700'} text-[10px] flex-shrink-0`}>
                            {TYPE_LABELS[tpl.type] || tpl.type}
                          </Badge>

                          <Badge variant="outline" className="text-[10px] flex-shrink-0">
                            {LANG_FLAGS[tpl.language] || ''} {LANG_LABELS[tpl.language] || tpl.language}
                          </Badge>

                          <span className="text-sm truncate flex-1 font-medium">
                            {tpl.subject}
                          </span>

                          {justSaved && (
                            <span className="text-green-600 text-xs flex items-center gap-1 flex-shrink-0">
                              <Check className="h-3 w-3" /> Sauvé
                            </span>
                          )}

                          <span className="text-muted-foreground flex-shrink-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </span>
                        </button>

                        {/* Expanded content */}
                        {isExpanded && (
                          <CardContent className="pt-0 pb-4 px-3 sm:px-4 space-y-3 border-t">
                            {isEditing ? (
                              /* Edit mode */
                              <div className="space-y-3 pt-3">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-muted-foreground">Objet</label>
                                  <Input
                                    value={editSubject}
                                    onChange={e => setEditSubject(e.target.value)}
                                    className="text-sm"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-muted-foreground">Corps du mail</label>
                                  <textarea
                                    value={editBody}
                                    onChange={e => setEditBody(e.target.value)}
                                    rows={12}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[200px]"
                                  />
                                </div>

                                {/* Variables hint */}
                                {tpl.variables && tpl.variables.length > 0 && (
                                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                                    <span className="font-medium">Variables disponibles : </span>
                                    {tpl.variables.map((v: string, i: number) => (
                                      <code key={i} className="bg-background px-1 rounded text-[10px] mr-1">
                                        {`{{${v}}}`}
                                      </code>
                                    ))}
                                  </div>
                                )}

                                <div className="flex gap-2 justify-end">
                                  <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Annuler
                                  </Button>
                                  <Button size="sm" onClick={saveEdit} disabled={saving}>
                                    {saving ? (
                                      <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Sauvegarde...</>
                                    ) : (
                                      <><Check className="h-3.5 w-3.5 mr-1" /> Sauvegarder</>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* View mode */
                              <div className="space-y-3 pt-3">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Objet</p>
                                  <p className="text-sm bg-muted/50 rounded-md px-3 py-2">{tpl.subject}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Corps du mail</p>
                                  <pre className="text-sm bg-muted/50 rounded-md px-3 py-2 whitespace-pre-wrap font-sans leading-relaxed max-h-[300px] overflow-y-auto">
                                    {tpl.body}
                                  </pre>
                                </div>

                                {tpl.variables && tpl.variables.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">Variables : </span>
                                    {tpl.variables.map((v: string, i: number) => (
                                      <code key={i} className="bg-muted px-1 rounded text-[10px] mr-1">
                                        {`{{${v}}}`}
                                      </code>
                                    ))}
                                  </div>
                                )}

                                <div className="flex justify-end">
                                  <Button variant="outline" size="sm" onClick={() => startEdit(tpl)}>
                                    <Pencil className="h-3.5 w-3.5 mr-1" />
                                    Modifier
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
