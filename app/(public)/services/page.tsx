import type { Metadata } from 'next';
<<<<<<< HEAD
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Compass, ExternalLink } from 'lucide-react';
import { getAdminServices } from '@/lib/firebase-admin-queries';
=======
import { Compass } from 'lucide-react';
>>>>>>> d7021ad36ad1eba14d13b2386d1b43a5b90de9ab
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';
import { getAdminServices, getSiteContentBySectionAdmin } from '@/lib/firebase-admin-queries';
import ServiceCard from '@/components/ui/service-card';

function contentMap(items: { key: string; value: string }[]) {
  return Object.fromEntries(items.map((i) => [i.key, i.value]));
}

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const m = messages[locale];
  const content = await getSiteContentBySectionAdmin('services_page');
  const c = contentMap(content);
  const title = c.page_services_title?.trim() || m.page_services_title;
  const description = c.page_services_meta?.trim() || m.page_services_meta;
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
  const tx = (cmsKey: string, fallback: string) => c[cmsKey]?.trim() || fallback;

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

  const services = await getAdminServices();

  return (
<<<<<<< HEAD
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/50 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 mb-5">
            <Compass className="w-7 h-7 text-orange-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
            {m.page_services_title}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {m.page_services_intro}
          </p>
        </div>

        {services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card
                key={service.id}
                className="overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {service.featured && (
                    <Badge className="absolute top-3 left-3 bg-teal-500 hover:bg-teal-600 text-white">
                      {m.page_services_featured}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-3">{service.description}</p>
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                    >
                      <Link href={service.externalLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {m.page_services_book}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="max-w-xl mx-auto text-center rounded-2xl border bg-card/80 shadow-sm p-12">
            <p className="text-muted-foreground text-lg mb-8">{m.page_services_empty}</p>
            <Button
              asChild
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              <Link href="/properties">{m.home_cta_properties}</Link>
            </Button>
          </div>
        )}
=======
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
>>>>>>> d7021ad36ad1eba14d13b2386d1b43a5b90de9ab
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {services.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 mb-6">
              <Compass className="w-9 h-9 text-orange-600" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-semibold text-gray-700">
              {m.home_services_empty}
            </h2>
            <p className="mt-2 text-gray-500">{tx('page_services_intro', m.page_services_intro)}</p>
          </div>
        ) : (
          <>
            {/* Featured row */}
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

            {/* All services */}
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
          </>
        )}
      </div>
    </div>
  );
}
