'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: '/dashboard/settings', label: 'Profil', exact: true },
    { href: '/dashboard/settings/templates', label: 'Templates d\'emails' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paramètres</h1>
        <p className="text-gray-600">
          Personnalisez votre profil et vos templates d'emails
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'pb-3 border-b-2 transition-colors text-sm font-medium',
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
