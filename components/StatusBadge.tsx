"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

interface StatusBadgeProps {
  productId: string;
  currentStatus: 'to_review' | 'standby' | 'contacted' | 'archived';
}

const STATUS_CONFIG = {
  to_review: {
    label: 'À réviser',
    icon: '⚡',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  },
  standby: {
    label: 'Stand by',
    icon: '⏸️',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  },
  contacted: {
    label: 'Contacté',
    icon: '✅',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  },
  archived: {
    label: 'Archivé',
    icon: '🗑️',
    className: 'bg-red-100 text-red-800 hover:bg-red-200',
  },
};

export function StatusBadge({ productId, currentStatus }: StatusBadgeProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: typeof currentStatus) => {
    if (newStatus === status) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setStatus(newStatus);
      router.refresh(); // Rafraîchir la page pour voir les changements
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour du statut');
    } finally {
      setLoading(false);
    }
  };

  const currentConfig = STATUS_CONFIG[status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge
          className={`${currentConfig.className} cursor-pointer transition-colors ${
            loading ? 'opacity-50' : ''
          }`}
          disabled={loading}
        >
          {currentConfig.icon} {currentConfig.label}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => handleStatusChange(key as typeof currentStatus)}
            className={key === status ? 'bg-gray-100' : ''}
          >
            <span className="mr-2">{config.icon}</span>
            {config.label}
            {key === status && <span className="ml-auto text-blue-600">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
