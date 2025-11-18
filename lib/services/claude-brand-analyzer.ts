import Anthropic from '@anthropic-ai/sdk';
import { JinaScrapedData } from '@/lib/utils/validators';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Interface pour l'analyse de marque par Claude
 */
export interface ClaudeBrandAnalysis {
  brand: {
    name: string;
    tagline: string | null;
    description: string;
    categories: string[];
  };
  visuals: {
    logo_url: string | null;
    brand_images: string[];
  };
  best_sellers: Array<{
    name: string;
    image_url: string | null;
    category: string | null;
  }>;
  company: {
    name: string;
    parent_company: string | null;
    website: string | null;
    email: string | null;
    linkedin: string | null;
    country: string | null;
    founded_year: number | null;
    has_ecommerce: boolean;
  };
  contacts: Array<{
    name: string;
    title: string;
    email: string | null;
    linkedin_url: string | null;
    location: string | null;
    phone: string | null;
    source: string;
    confidence: number;
  }>;
  confidence: number;
}

/**
 * Analyse une marque avec Claude API (focus sur l'univers global, pas un produit unique)
 *
 * @param scrapedData - Les données scrapées par Jina AI Reader (homepage ou about page)
 * @returns L'analyse structurée de la marque
 */
export async function analyzeBrand(
  scrapedData: JinaScrapedData
): Promise<ClaudeBrandAnalysis> {
  try {
    const prompt = `Tu es un expert en analyse de marques pour une marketplace suisse. Analyse ce contenu et retourne UNIQUEMENT un JSON valide (pas de texte avant ou après).

DONNÉES DE LA MARQUE:
Title: ${scrapedData.title || 'N/A'}
Description: ${scrapedData.description || 'N/A'}
Content: ${scrapedData.content.slice(0, 20000)} // Plus de contenu pour capturer l'univers de la marque

INSTRUCTIONS:
1. Extrait le nom exact de la marque
2. Identifie le tagline/slogan de la marque s'il existe
3. **Rédige une description de la marque EN FRANÇAIS** (400-600 caractères):
   - Histoire de la marque
   - Valeurs et positionnement
   - Univers/identité de la marque
   - Traduis en français si le contenu est dans une autre langue

4. **SUPER PRIORITAIRE: Trouve l'URL du LOGO de la marque**:
   - Cherche dans le header (balise <header>, <nav>)
   - Cherche les balises <img> avec attributs: class="logo", id="logo", alt="logo"
   - Cherche dans le footer
   - Cherche les URLs contenant "logo", "brand", "mark"
   - Retourne l'URL complète de l'image (PNG, SVG, JPG, WEBP)
   - Préfère le logo principal/header plutôt que les variations

5. Identifie les **3-5 best sellers / produits phares** de la marque:
   - Nom du produit
   - URL de l'image du produit si disponible
   - Catégorie approximative (ex: "Outdoor Grills", "Beauty Device", "Coffee Machine")

6. Liste les **catégories de produits** couvertes par la marque (max 5 catégories générales)
   - Exemples: "Grills & BBQ", "Outdoor Furniture", "Fire Pits", "Accessories"
   - Évite les sous-catégories trop spécifiques

7. Images de la marque (2-4 images représentatives de l'univers):
   - Photos lifestyle/ambiance
   - Visuels des produits en contexte
   - Pas le logo

8. Informations entreprise:
   - Nom de l'entreprise (peut être différent du nom de marque)
   - Société mère si applicable
   - Site web officiel
   - Email de contact (contact@, info@, sales@)
   - Page LinkedIn de l'entreprise (PAS un profil personnel)
   - Pays d'origine (code ISO: CH, FR, DE, IT, US, etc.)
   - Année de fondation si disponible
   - E-commerce actif (true/false)

9. **PRIORITAIRE: Cherche des contacts responsables des marchés Suisse et Européen**:
   - Focus: "Switzerland Manager", "Swiss Market", "Europe Manager", "Export Manager", "International Sales", "DACH Region"
   - Extraire: nom, titre/fonction, email, LinkedIn URL, localisation, téléphone
   - Maximum 3 contacts pertinents pour CH/EU
   - Localisation: priorité CH > FR > DE > IT > autres EU

10. Score de confiance global (0.00 à 1.00)

Retourne ce JSON (rien d'autre):
{
  "brand": {
    "name": "Nom de la marque",
    "tagline": "Slogan ou null",
    "description": "Description EN FRANÇAIS de 400-600 caractères",
    "categories": ["Categorie 1", "Categorie 2", "Categorie 3"]
  },
  "visuals": {
    "logo_url": "https://example.com/logo.png ou null",
    "brand_images": [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg"
    ]
  },
  "best_sellers": [
    {
      "name": "Nom du produit phare",
      "image_url": "https://example.com/product.jpg ou null",
      "category": "Catégorie du produit ou null"
    }
  ],
  "company": {
    "name": "Nom entreprise",
    "parent_company": "Société mère ou null",
    "website": "https://example.com ou null",
    "email": "contact@example.com ou null",
    "linkedin": "https://linkedin.com/company/example ou null",
    "country": "DE ou null",
    "founded_year": 2010 ou null,
    "has_ecommerce": true
  },
  "contacts": [
    {
      "name": "John Doe",
      "title": "Sales Manager Switzerland & DACH Region",
      "email": "j.doe@company.com ou null",
      "linkedin_url": "https://linkedin.com/in/johndoe ou null",
      "location": "Zurich, Switzerland ou null",
      "phone": "+41 XX XXX XX XX ou null",
      "source": "claude_extraction",
      "confidence": 0.95
    }
  ],
  "confidence": 0.90
}

IMPORTANT: Retourne UNIQUEMENT le JSON, pas de texte explicatif avant ou après.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extraire le texte de la réponse
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    const rawText = content.text;
    console.log('🤖 Raw Claude response (first 500 chars):', rawText.substring(0, 500));

    // Parser le JSON
    let parsedData: ClaudeBrandAnalysis;
    try {
      // Nettoyer le texte (enlever markdown fences si présentes)
      const cleanedText = rawText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ Failed to parse Claude response:', parseError);
      console.error('Raw response:', rawText);
      throw new Error('Claude returned invalid JSON for brand analysis');
    }

    // Validation basique
    if (!parsedData.brand?.name) {
      throw new Error('Brand analysis missing required field: brand.name');
    }

    console.log('✅ Brand analysis completed:', {
      name: parsedData.brand.name,
      logo: parsedData.visuals.logo_url ? 'Found' : 'Missing',
      bestSellers: parsedData.best_sellers.length,
      contacts: parsedData.contacts.length,
      confidence: parsedData.confidence,
    });

    return parsedData;
  } catch (error) {
    console.error('❌ Error in analyzeBrand:', error);
    throw error;
  }
}
