"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/products", label: "Produits" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
              <span className="text-lg font-bold text-white">P</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              Prospection-ODL
            </span>
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                ⚙️ Paramètres
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
