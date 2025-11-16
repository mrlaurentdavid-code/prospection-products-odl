import Anthropic from '@anthropic-ai/sdk';
import { JinaScrapedData, ClaudeAnalysis, claudeAnalysisSchema } from '@/lib/utils/validators';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Interface pour les catégories
 */
interface Category {
  id: number;
  name_en: string;
  name_fr: string;
}

interface Subcategory {
  id: number;
  category_id: number;
  name_en: string;
  name_fr: string;
}

/**
 * Génère la liste des catégories pour le prompt Claude
 */
function generateCategoriesList(categories: Category[], subcategories: Subcategory[]): string {
  let list = '';

  categories.forEach(cat => {
    list += `\n**${cat.name_en}** (${cat.name_fr}):\n`;
    const subs = subcategories.filter(sub => sub.category_id === cat.id);
    subs.forEach(sub => {
      list += `  - ${sub.name_en} (${sub.name_fr})\n`;
    });
  });

  return list;
}

/**
 * Analyse le contenu scrapé avec Claude API et extrait les informations structurées
 *
 * @param scrapedData - Les données scrapées par Jina AI Reader
 * @param categories - Les catégories disponibles
 * @param subcategories - Les sous-catégories disponibles
 * @returns L'analyse structurée du produit
 */
export async function analyzeProduct(
  scrapedData: JinaScrapedData,
  categories: Category[],
  subcategories: Subcategory[]
): Promise<ClaudeAnalysis> {
  try {
    const categoriesList = generateCategoriesList(categories, subcategories);

    const prompt = `Tu es un expert en analyse de produits pour une marketplace suisse. Analyse ce contenu et retourne UNIQUEMENT un JSON valide (pas de texte avant ou après).

DONNÉES DU PRODUIT:
Title: ${scrapedData.title || 'N/A'}
Description: ${scrapedData.description || 'N/A'}
Content: ${scrapedData.content.slice(0, 15000)} // Limité à 15000 caractères (augmenté pour voir plus de contenu)

CATÉGORIES DISPONIBLES (TU DOIS CHOISIR PARMI CES CATÉGORIES UNIQUEMENT):
${categoriesList}

INSTRUCTIONS:
1. Extrait le nom exact du produit (en anglais si possible)
2. Rédige une description concise (max 500 caractères)
3. Choisis LA catégorie et sous-catégorie EXACTES de la liste ci-dessus (utilise le nom anglais)
4. Identifie le nom de l'entreprise qui fabrique/vend ce produit
5. Trouve le site web officiel de l'entreprise (pas le lien du produit)
6. Cherche un email de contact (idéalement contact@, info@, sales@)
7. Cherche la page LinkedIn de l'entreprise (pas un profil personnel)
8. Identifie le pays de l'entreprise (code ISO: CH, FR, DE, IT, US, etc.)
9. Estime le prix public conseillé (MSRP) en EUR et CHF si possible
10. **NOUVEAU: Cherche des contacts décisionnaires européens** dans le contenu:
    - Recherche des noms de personnes avec leur fonction (Sales Manager, Business Dev, Export Manager, CEO, etc.)
    - Privilégie les contacts basés en Europe (CH, FR, DE, IT, NL, UK, ES, etc.)
    - Si trouvés: extraire nom, titre/fonction, email, LinkedIn profile URL, localisation
    - Focus sur: directeurs commerciaux, business development, export, ventes
    - Maximum 3 contacts les plus pertinents
11. Fournis un score de confiance (0.00 à 1.00) basé sur la qualité des données

Retourne ce JSON (rien d'autre):
{
  "product": {
    "name": "nom du produit",
    "description": "description concise en anglais",
    "category": "catégorie exacte de la liste (nom anglais)",
    "subcategory": "sous-catégorie exacte (nom anglais)"
  },
  "company": {
    "name": "nom de l'entreprise",
    "website": "url du site officiel ou null",
    "email": "email de contact ou null",
    "linkedin": "url linkedin entreprise ou null",
    "country": "code ISO pays ou null"
  },
  "pricing": {
    "estimatedMSRP_EU": 0 ou null,
    "estimatedMSRP_CH": 0 ou null,
    "sourceURL": "lien marketplace concurrent ou null"
  },
  "contacts": [
    {
      "name": "John Doe",
      "title": "Sales Manager Europe",
      "email": "j.doe@company.com ou null",
      "linkedin_url": "https://linkedin.com/in/johndoe ou null",
      "location": "Paris, France ou null",
      "phone": "+33 6 XX XX XX XX ou null",
      "source": "claude_extraction",
      "confidence": 0.85
    }
  ],
  "confidence": 0.95
}

IMPORTANT: Retourne UNIQUEMENT le JSON, pas de texte explicatif avant ou après.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000, // Augmenté pour traiter plus de contenu et inclure les contacts
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

    const textContent = content.text.trim();

    // Extraire le JSON (au cas où Claude ajoute du texte avant/après)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const jsonString = jsonMatch[0];
    const parsed = JSON.parse(jsonString);

    // Valider avec Zod
    const validated = claudeAnalysisSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error('Claude analysis error:', error);
    throw new Error(
      `Échec de l'analyse Claude: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retry logic pour l'analyse (1 retry en cas d'échec)
 */
export async function analyzeProductRetry(
  scrapedData: JinaScrapedData,
  categories: Category[],
  subcategories: Subcategory[]
): Promise<ClaudeAnalysis> {
  try {
    return await analyzeProduct(scrapedData, categories, subcategories);
  } catch (error) {
    console.log('Retry analysis after first failure...');
    // Attendre 2 secondes avant de retry
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await analyzeProduct(scrapedData, categories, subcategories);
  }
}
