import { JinaScrapedData } from '@/lib/utils/validators';

/**
 * Détecte le type de source à partir de l'URL
 */
function detectSourceType(url: string): JinaScrapedData['sourceType'] {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('instagram.com')) return 'instagram';
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) return 'facebook';
  if (urlLower.includes('tiktok.com')) return 'tiktok';

  return 'website';
}

/**
 * Scrape le contenu d'une URL avec Jina AI Reader
 *
 * Jina AI Reader API (gratuit, pas de clé API requise):
 * - URL: https://r.jina.ai/{encoded_url}
 * - Retourne le contenu en markdown
 * - Support Instagram, Facebook, TikTok, sites web
 *
 * @param url - L'URL à scraper
 * @returns Les données scrapées (titre, description, contenu, images)
 */
export async function scrapeWithJina(url: string): Promise<JinaScrapedData> {
  try {
    // Encoder l'URL pour Jina AI Reader
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

    // Appel à Jina AI Reader (retourne du markdown texte)
    const response = await fetch(jinaUrl);

    if (!response.ok) {
      throw new Error(`Jina AI Reader error: ${response.status} ${response.statusText}`);
    }

    const textContent = await response.text();

    // Extraire le titre (première ligne après "Title:")
    const titleMatch = textContent.match(/Title:\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extraire le contenu markdown (après "Markdown Content:")
    const contentMatch = textContent.match(/Markdown Content:\s*([\s\S]+)/);
    const content = contentMatch ? contentMatch[1].trim() : textContent;

    // Extraire les images depuis le contenu markdown (format: ![alt](url) ou [![...](url)](link))
    const imageRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g;
    const imageMatches = content.matchAll(imageRegex);

    // Fonction pour extraire les dimensions depuis les query params
    const extractDimensions = (url: string): { width: number; height: number } | null => {
      try {
        const urlObj = new URL(url);
        const width = urlObj.searchParams.get('w') || urlObj.searchParams.get('width');
        const height = urlObj.searchParams.get('h') || urlObj.searchParams.get('height');
        if (width && height) {
          return { width: parseInt(width), height: parseInt(height) };
        }
      } catch {}
      return null;
    };

    // Filtrer et scorer les images pour mettre les vraies images produit en premier
    const allImages = Array.from(imageMatches)
      .map(match => {
        // Remplacer les placeholders Shopify AVANT le filtrage
        let url = match[1];
        url = url.replace(/\{width\}/g, '800');
        url = url.replace(/\{height\}/g, '800');
        return url;
      })
      .filter(url => {
        const urlLower = url.toLowerCase();
        // Exclure les images data: et SVG
        if (url.includes('data:image') || urlLower.endsWith('.svg')) return false;
        // Exclure les logos, icônes, sprites
        if (urlLower.includes('logo') || urlLower.includes('icon') || urlLower.includes('sprite')) return false;

        // Exclure les images avec ratio d'aspect > 3:1 (bannières/logos)
        const dims = extractDimensions(url);
        if (dims) {
          const ratio = dims.width / dims.height;
          if (ratio > 3 || ratio < 0.5) return false; // Trop large ou trop haut
        }

        return true;
      });

    // Scorer les images (score plus élevé = plus pertinent)
    const scoredImages = allImages.map(url => {
      const urlLower = url.toLowerCase();
      let score = 0;

      // Bonus pour images produit
      if (urlLower.includes('product') || urlLower.includes('item')) score += 10;
      if (urlLower.includes('gallery') || urlLower.includes('image')) score += 5;

      // Malus pour images UI/navigation
      if (urlLower.includes('banner') || urlLower.includes('header')) score -= 5;
      if (urlLower.includes('footer') || urlLower.includes('nav')) score -= 5;
      if (urlLower.includes('menu') || urlLower.includes('button')) score -= 5;

      // Bonus pour URLs avec CDN produit
      if (urlLower.includes('cdn') && urlLower.includes('product')) score += 5;

      return { url, score };
    });

    // Trier par score décroissant et prendre les 10 meilleures
    const images = scoredImages
      .sort((a, b) => b.score - a.score)
      .map(item => item.url)
      .slice(0, 10);

    // Extraire une description (premiers 500 caractères du contenu sans markdown)
    const cleanContent = content
      .replace(/!\[.*?\]\(.*?\)/g, '') // Retirer les images
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Retirer les liens
      .replace(/#+ /g, '') // Retirer les titres
      .replace(/[-*_]{2,}/g, '') // Retirer les séparateurs
      .trim();

    const description = cleanContent.slice(0, 500);

    return {
      title,
      description,
      content: cleanContent,
      images,
      sourceType: detectSourceType(url),
    };
  } catch (error) {
    console.error('Jina scraping error:', error);
    throw new Error(
      `Échec du scraping avec Jina AI Reader: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retry logic pour le scraping (1 retry en cas d'échec)
 */
export async function scrapeWithJinaRetry(url: string): Promise<JinaScrapedData> {
  try {
    return await scrapeWithJina(url);
  } catch (error) {
    console.log('Retry scraping after first failure...');
    // Attendre 2 secondes avant de retry
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await scrapeWithJina(url);
  }
}
