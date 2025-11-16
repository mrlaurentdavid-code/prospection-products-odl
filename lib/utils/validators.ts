import { z } from 'zod';

// Validator pour l'URL source
export const urlSchema = z.string().url('URL invalide');

// Validator pour le résultat du scraping Jina
export const jinaScrapedDataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.string(),
  images: z.array(z.string().url()).optional().default([]),
  sourceType: z.enum(['instagram', 'facebook', 'tiktok', 'website', 'other']),
});

export type JinaScrapedData = z.infer<typeof jinaScrapedDataSchema>;

// Validator pour l'analyse Claude
export const claudeAnalysisSchema = z.object({
  product: z.object({
    name: z.string().min(1, 'Le nom du produit est requis'),
    description: z.string().max(500, 'Description trop longue (max 500 caractères)').nullable(),
    category: z.string().nullable(),
    subcategory: z.string().nullable(),
  }),
  company: z.object({
    name: z.string().nullable(),
    website: z.string().url().optional().nullable(),
    email: z.string().email().optional().nullable(),
    linkedin: z.string().url().optional().nullable(),
    country: z.string().length(2).optional().nullable(), // Code ISO (CH, FR, DE, etc.)
  }),
  pricing: z.object({
    estimatedMSRP_EU: z.number().min(0).optional().nullable(),
    estimatedMSRP_CH: z.number().min(0).optional().nullable(),
    sourceURL: z.string().url().optional().nullable(),
  }),
  confidence: z.number().min(0).max(1),
});

export type ClaudeAnalysis = z.infer<typeof claudeAnalysisSchema>;

// Validator pour la requête d'analyse
export const analyzeRequestSchema = z.object({
  url: urlSchema,
  telegramChatId: z.string().optional(), // Pour envoyer la notification Telegram
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
