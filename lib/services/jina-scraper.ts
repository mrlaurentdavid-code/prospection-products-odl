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

        // Exclure les logos, icônes, sprites, schémas
        const excludeKeywords = [
          'logo', 'icon', 'sprite', 'favicon',
          'schema', 'diagram', 'illustration', 'picto',
          'weight', 'compare', 'comparison', 'chart',
          'thumbnail', 'thumb', 'badge', 'stamp',
          'banner', 'header', 'footer', 'nav',
          'menu', 'button', 'arrow', 'chevron',
          'placeholder', 'loading', 'spinner'
        ];

        if (excludeKeywords.some(keyword => urlLower.includes(keyword))) return false;

        // Exclure les images avec dimensions dans l'URL qui sont trop petites
        const dims = extractDimensions(url);
        if (dims) {
          // Minimum 200x200 pour être une vraie photo produit
          if (dims.width < 200 || dims.height < 200) return false;

          // Exclure les images avec ratio d'aspect étrange (bannières, boutons)
          const ratio = dims.width / dims.height;
          if (ratio > 2.5 || ratio < 0.4) return false;
        }

        // Exclure les URLs avec des patterns suspects
        if (/\d{1,3}x\d{1,3}/.test(urlLower)) {
          // Pattern genre "50x50" ou "100x100" (petites icônes)
          const match = urlLower.match(/(\d{1,3})x(\d{1,3})/);
          if (match) {
            const w = parseInt(match[1]);
            const h = parseInt(match[2]);
            if (w < 200 || h < 200) return false;
          }
        }

        return true;
      });

    // Scorer les images (score plus élevé = plus pertinent)
    const scoredImages = allImages.map(url => {
      const urlLower = url.toLowerCase();
      let score = 0;

      // BONUS ÉLEVÉ pour vraies images produit
      if (urlLower.includes('product')) score += 20;
      if (urlLower.includes('item')) score += 15;
      if (urlLower.includes('gallery')) score += 15;
      if (urlLower.includes('main')) score += 10;
      if (urlLower.includes('hero')) score += 10;
      if (urlLower.includes('featured')) score += 10;

      // Bonus pour extensions d'images courantes (photos)
      if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) score += 5;
      if (urlLower.endsWith('.png')) score += 3;
      if (urlLower.endsWith('.webp')) score += 5;

      // Bonus pour URLs avec CDN produit
      if (urlLower.includes('cdn')) score += 5;
      if (urlLower.includes('shopify') && urlLower.includes('product')) score += 10;
      if (urlLower.includes('woocommerce')) score += 5;

      // Bonus pour dimensions larges (vraies photos produit sont généralement grandes)
      const dims = extractDimensions(url);
      if (dims) {
        if (dims.width >= 800 || dims.height >= 800) score += 10;
        if (dims.width >= 1200 || dims.height >= 1200) score += 5;
      }

      // Malus pour patterns suspects
      if (urlLower.includes('_thumb')) score -= 10;
      if (urlLower.includes('_small')) score -= 10;
      if (urlLower.includes('-xs') || urlLower.includes('-sm')) score -= 10;

      return { url, score };
    });

    // Trier par score décroissant et prendre les 10 meilleures
    const images = scoredImages
      .sort((a, b) => b.score - a.score)
      .map(item => item.url)
      .slice(0, 10);

    // Debug logging pour voir les images sélectionnées
    if (images.length > 0) {
      console.log(`📸 Jina: Found ${allImages.length} images, selected top ${images.length} after scoring`);
      console.log(`📸 Top image score: ${scoredImages[0]?.score || 0}`);
    } else {
      console.log('⚠️ Jina: No product images found after filtering');
    }

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
