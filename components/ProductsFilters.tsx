"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ProductsFiltersProps {
  categories: string[];
  subcategories: string[];
}

export function ProductsFilters({ categories, subcategories }: ProductsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") || "all";
  const currentCategory = searchParams.get("category") || "all";
  const currentSubcategory = searchParams.get("subcategory") || "all";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/dashboard/products?${params.toString()}`);
  };

  const hasActiveFilters = currentStatus !== "all" || currentCategory !== "all" || currentSubcategory !== "all";

  const clearFilters = () => {
    router.push("/dashboard/products");
  };

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {/* Filtre par statut */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">Statut</label>
        <Select value={currentStatus} onValueChange={(value) => updateFilter("status", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="to_review">À réviser</SelectItem>
            <SelectItem value="standby">En attente</SelectItem>
            <SelectItem value="contacted">Contacté</SelectItem>
            <SelectItem value="archived">Archivé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filtre par catégorie */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">Catégorie</label>
        <Select value={currentCategory} onValueChange={(value) => updateFilter("category", value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtre par sous-catégorie */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">Sous-catégorie</label>
        <Select value={currentSubcategory} onValueChange={(value) => updateFilter("subcategory", value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Toutes les sous-catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sous-catégories</SelectItem>
            {subcategories.map((subcat) => (
              <SelectItem key={subcat} value={subcat}>
                {subcat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bouton reset */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:text-blue-800 underline mt-5"
        >
          Réinitialiser
        </button>
      )}

      {/* Active filters badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-5">
          {currentStatus !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Statut: {currentStatus}
              <button
                onClick={() => updateFilter("status", "all")}
                className="ml-1 hover:text-red-600"
              >
                ×
              </button>
            </Badge>
          )}
          {currentCategory !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Catégorie: {currentCategory}
              <button
                onClick={() => updateFilter("category", "all")}
                className="ml-1 hover:text-red-600"
              >
                ×
              </button>
            </Badge>
          )}
          {currentSubcategory !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Sous-catégorie: {currentSubcategory}
              <button
                onClick={() => updateFilter("subcategory", "all")}
                className="ml-1 hover:text-red-600"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
