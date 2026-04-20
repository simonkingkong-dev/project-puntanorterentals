import type { MetadataRoute } from 'next';
import { getAdminProperties } from '@/lib/firebase-admin-queries';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://puntanorterentals.com';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/properties`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/services`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/help`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/cancellation`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  let propertyRoutes: MetadataRoute.Sitemap = [];
  try {
    const properties = await getAdminProperties();
    propertyRoutes = properties
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${BASE_URL}/properties/${p.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
  } catch {
    // Firestore unavailable at build time — static routes still served
  }

  return [...staticRoutes, ...propertyRoutes];
}
