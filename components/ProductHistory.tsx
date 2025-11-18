"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HistoryEvent {
  event_type: string;
  event_date: string;
  user_name: string | null;
  user_email: string | null;
  details: Record<string, any>;
}

interface ProductHistoryProps {
  productId: string;
}

const EVENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  product_created: {
    label: 'Produit ajouté',
    icon: '➕',
    color: 'bg-green-100 text-green-800',
  },
  product_reviewed: {
    label: 'Produit reviewé',
    icon: '👁️',
    color: 'bg-blue-100 text-blue-800',
  },
  product_contacted: {
    label: 'Premier contact',
    icon: '📧',
    color: 'bg-purple-100 text-purple-800',
  },
  email_sent: {
    label: 'Email envoyé',
    icon: '✉️',
    color: 'bg-yellow-100 text-yellow-800',
  },
};

export function ProductHistory({ productId }: ProductHistoryProps) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(`/api/products/${productId}/history`);
        if (!response.ok) {
          throw new Error('Failed to load history');
        }
        const data = await response.json();
        setHistory(data.history || []);
      } catch (err) {
        console.error('Error loading history:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [productId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📜 Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📜 Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Erreur: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📜 Historique</CardTitle>
          <CardDescription>Aucun événement enregistré</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">📜 Historique</CardTitle>
        <CardDescription>{history.length} événement(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((event, index) => {
            const config = EVENT_LABELS[event.event_type] || {
              label: event.event_type,
              icon: '📝',
              color: 'bg-gray-100 text-gray-800',
            };

            return (
              <div key={index} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
                {/* Icon et badge */}
                <div className="flex-shrink-0 mt-1">
                  <Badge className={config.color}>
                    {config.icon} {config.label}
                  </Badge>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Date */}
                  <p className="text-xs text-gray-500">
                    {new Date(event.event_date).toLocaleString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>

                  {/* User */}
                  {event.user_name && (
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {event.user_name}
                    </p>
                  )}
                  {event.user_email && (
                    <p className="text-xs text-gray-500">{event.user_email}</p>
                  )}

                  {/* Details */}
                  {event.details && Object.keys(event.details).length > 0 && (
                    <div className="mt-2 text-sm text-gray-700">
                      {event.event_type === 'email_sent' && (
                        <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                          <p>
                            <strong>À:</strong> {event.details.to_email}
                          </p>
                          {event.details.contact_name && (
                            <p>
                              <strong>Contact:</strong> {event.details.contact_name}
                            </p>
                          )}
                          <p>
                            <strong>Sujet:</strong> {event.details.subject}
                          </p>
                          {event.details.status && (
                            <Badge variant="outline" className="text-xs">
                              {event.details.status}
                            </Badge>
                          )}
                        </div>
                      )}

                      {event.event_type === 'product_created' && (
                        <div className="text-xs space-y-1">
                          <p>
                            <strong>Source:</strong> {event.details.source_type}
                          </p>
                          <p className="text-gray-500 truncate">
                            {event.details.source_url}
                          </p>
                        </div>
                      )}

                      {event.event_type === 'product_reviewed' && (
                        <Badge variant="outline" className="text-xs">
                          Status: {event.details.status}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
