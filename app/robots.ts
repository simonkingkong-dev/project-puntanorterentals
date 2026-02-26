import type { MetadataRoute } from 'next';

/**
 * Sirve /robots.txt para crawlers (Google, Bing, etc.).
 * Evita 404 en logs y define qué rutas no deben indexarse.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
  };
}
