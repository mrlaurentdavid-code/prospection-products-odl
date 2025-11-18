"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { ChevronDown, Trash2 } from 'lucide-react';

interface BrandStatusBadgeProps {
  brandId: string;
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

export function BrandStatusBadge({ brandId, currentStatus }: BrandStatusBadgeProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: typeof currentStatus) => {
    if (newStatus === status) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/brands/${brandId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ API Error:', data);
        throw new Error(data.error || 'Failed to update status');
      }

      console.log('✅ Brand status updated successfully:', data);
      setStatus(newStatus);
      router.refresh(); // Rafraîchir la page pour voir les changements
    } catch (error) {
      console.error('❌ Error updating brand status:', error);
      alert(`Erreur lors de la mise à jour du statut: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = confirm(
      'Êtes-vous sûr de vouloir supprimer définitivement cette marque ?\n\nCette action est irréversible.'
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/brands/${brandId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ API Error:', data);
        throw new Error(data.error || 'Failed to delete brand');
      }

      console.log('✅ Brand deleted successfully:', data);

      // Rediriger vers la liste des marques
      router.push('/dashboard/brands');
    } catch (error) {
      console.error('❌ Error deleting brand:', error);
      alert(`Erreur lors de la suppression de la marque: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const currentConfig = STATUS_CONFIG[status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        <Badge
          className={`${currentConfig.className} cursor-pointer transition-colors ${
            loading ? 'opacity-50 pointer-events-none' : ''
          } flex items-center gap-1.5`}
        >
          <span>{currentConfig.icon} {currentConfig.label}</span>
          <ChevronDown className="h-3 w-3" />
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
