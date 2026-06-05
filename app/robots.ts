import type { MetadataRoute } from 'next';

/**
 * Sirve /robots.txt para crawlers (Google, Bing, etc.).
 * No listamos rutas sensibles (ej. /admin/, /api/) para no revelarlas;
 * la protección se hace por autenticación y WAF.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      // AI search engine bots — allow explicitly for GEO (Generative Engine Optimization)
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },
      { userAgent: 'BingPreview', allow: '/' },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://puntanorterentals.com'}/sitemap.xml`,
  };
}
