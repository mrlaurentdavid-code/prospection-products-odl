// Types générés depuis Supabase

export interface Product {
  id: string;
  created_at: string;
  updated_at: string;
  source_url: string;
  source_type: 'instagram' | 'facebook' | 'tiktok' | 'website' | 'other';
  name: string;
  description: string | null;
  category_id: number | null;
  subcategory_id: number | null;
  category: string | null;  // Category name from AI (e.g., "Sports & Leisure")
  subcategory: string | null;  // Subcategory name from AI (e.g., "Water Sports")
  images: string[];
  videos: string[];
  msrp_eu: number | null;
  msrp_ch: number | null;
  msrp_source_url: string | null;
  currency: string;
  company_name: string | null;
  company_website: string | null;
  company_email: string | null;
  company_linkedin: string | null;
  company_country: string | null;
  company_address: string | null;
  company_founded_year: number | null;
  company_has_ecommerce: boolean;
  status: 'to_review' | 'standby' | 'contacted' | 'archived';
  ai_confidence_score: number | null;
  ai_raw_analysis: any;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface Category {
  id: number;
  name_en: string;
  name_fr: string;
  name_de: string;
  name_it: string;
  created_at: string;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name_en: string;
  name_fr: string;
  name_de: string;
  name_it: string;
  created_at: string;
}
