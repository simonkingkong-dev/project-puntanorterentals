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
    ],
  };
}
