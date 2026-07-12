import type { Metadata } from 'next';
import { Compass } from 'lucide-react';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';
import { getAdminServices, getSiteContentBySectionAdmin } from '@/lib/firebase-admin-queries';
import ServiceCard from '@/components/ui/service-card';
import RezdyBookingEmbed from '@/components/service/rezdy-booking-embed';
import { contentMap, pickSiteContent } from '@/lib/site-content-localization';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const m = messages[locale];
  const content = await getSiteContentBySectionAdmin('services_page');
  const c = contentMap(content);
  const title = pickSiteContent(c, 'page_services_title', locale, m.page_services_title);
  const description = pickSiteContent(c, 'page_services_meta', locale, m.page_services_meta);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | Punta Norte Rentals`,
      description,
      url: `${siteUrl}/services`,
      type: 'website',
      images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Punta Norte Rentals`,
      description,
      images: [`${siteUrl}/og-image.png`],
    },
    alternates: { canonical: `${siteUrl}/services` },
  };
}

export default async function ServicesPage() {
  const locale = await getServerLocale();
  const m = messages[locale];
  const content = await getSiteContentBySectionAdmin('services_page');
  const c = contentMap(content);
  const tx = (cmsKey: string, fallback: string) => pickSiteContent(c, cmsKey, locale, fallback);

  const allServices = await getAdminServices();
  const featured = allServices.filter(s => s.featured);
  const rest = allServices.filter(s => !s.featured);
  const services = [...featured, ...rest];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const servicesJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristInformationCenter',
    name: 'Punta Norte Rentals — Servicios',
    description: tx('page_services_meta', m.page_services_meta),
    url: `${siteUrl}/services`,
    image: `${siteUrl}/og-image.png`,
    address: { '@type': 'PostalAddress', addressCountry: 'MX', addressRegion: 'Punta Norte' },
    parentOrganization: { '@type': 'Organization', name: 'Punta Norte Rentals', url: siteUrl },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Servicios Vacacionales Punta Norte',
      itemListElement: services.map((s, i) => ({
        '@type': 'Offer',
        position: i + 1,
        itemOffered: { '@type': 'Service', name: s.title, description: s.description },
      })),
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesJsonLd) }}
      />
      {/* Hero */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 text-center">
          <div className="mx-auto flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-orange-500/10 mb-4 sm:mb-5">
            <Compass className="w-7 h-7 sm:w-9 sm:h-9 text-orange-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            {tx('page_services_title', m.page_services_title)}
          </h1>
          <p className="mt-3 sm:mt-4 text-gray-500 text-sm sm:text-lg max-w-2xl mx-auto">
            {tx('page_services_meta', m.page_services_meta)}
          </p>
        </div>
      </div>

      {/* Rezdy partner booking (desktop iframe / mobile redirect) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-4">
        <RezdyBookingEmbed />
      </div>

      {services.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {featured.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {m.home_services_title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              {featured.length > 0 && (
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {tx('services_more_title', locale === 'en' ? 'More experiences' : 'Más experiencias')}
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
