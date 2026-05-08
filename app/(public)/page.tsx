import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, MapPin, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchFormClient from "@/components/search-form-client";
import PropertyCard from "@/components/ui/property-card";
import HeroBackgroundRotator from "@/components/public/hero-background-rotator";
import {
  getFeaturedPropertiesAdmin,
  getSiteContentBySectionAdmin,
} from "@/lib/firebase-admin-queries";
import { getServerLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'Punta Norte Rentals - Propiedades Vacacionales en México',
  description: 'Casas y departamentos vacacionales en Punta Norte, México. Reserva directa con disponibilidad en tiempo real, pagos seguros con Stripe y atención personalizada. Desde $X USD/noche.',
  keywords: ['renta vacacional Punta Norte', 'casa playa México', 'vacation rental Mexico', 'propiedades vacacionales', 'departamento vacacional México'],
  openGraph: {
    title: 'Punta Norte Rentals - Propiedades Vacacionales en México',
    description: 'Casas y departamentos vacacionales en Punta Norte, México. Reserva directa con disponibilidad en tiempo real y pagos seguros.',
    url: '/',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Punta Norte Rentals - Propiedades vacacionales en México' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Punta Norte Rentals - Propiedades Vacacionales en México',
    description: 'Casas y departamentos vacacionales en Punta Norte, México. Reserva directa con pagos seguros.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: '/' },
};

function contentMap(items: { key: string; value: string }[]) {
  return Object.fromEntries(items.map((i) => [i.key, i.value]));
}

export default async function HomePage() {
  const locale = await getServerLocale();
  const L = messages[locale];

  const [featuredProperties, homepageContent] = await Promise.all([
    getFeaturedPropertiesAdmin(),
    getSiteContentBySectionAdmin("homepage"),
  ]);

  const c = contentMap(homepageContent);
  const tx = (cmsKey: string, i18nKey: keyof (typeof messages)[Locale]) =>
    c[cmsKey]?.trim() || L[i18nKey];
  const heroCoverImageFallback =
    c.hero_cover_image?.trim() ||
    "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop";
  const heroCoverImages = c.hero_cover_images
    ? c.hero_cover_images
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    : [heroCoverImageFallback];

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative min-h-[520px] sm:min-h-[600px] flex items-center justify-center">
        <div className="absolute inset-0">
          <HeroBackgroundRotator images={heroCoverImages} intervalMs={20000} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center text-white pt-8 pb-12">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-white/80 mb-4">
            Punta Norte Rentals
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 max-w-4xl mx-auto leading-tight">
            {tx("hero_title", "home_hero_title")}
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-white/90 leading-relaxed">
            {tx("hero_subtitle", "home_hero_subtitle")}
          </p>
          <div className="bg-white/10 backdrop-blur-md p-5 sm:p-6 rounded-xl max-w-4xl mx-auto border border-white/10 shadow-xl">
            <SearchFormClient />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-6 mb-10 md:mb-12">
            <div className="max-w-2xl text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900">
                {tx("featured_properties_title", "home_featured_title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {tx("featured_properties_subtitle", "home_featured_subtitle")}
              </p>
            </div>
            <Link href="/properties" className="shrink-0 hidden md:block">
              <Button variant="outline" className="gap-2">
                {L.home_view_all}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {featuredProperties.length > 0 ? (
            <Suspense
              fallback={
                <div className="flex gap-6 overflow-hidden pb-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="min-w-[300px] h-[420px] animate-pulse rounded-xl bg-muted sm:min-w-[340px] lg:min-w-[360px]"
                    />
                  ))}
                </div>
              }
            >
              <div className="relative">
                <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-3 md:gap-8">
                  {featuredProperties.map((property) => (
                    <div
                      key={property.id}
                      className="min-w-[300px] max-w-[300px] snap-start sm:min-w-[340px] sm:max-w-[340px] lg:min-w-[360px] lg:max-w-[360px]"
                    >
                      <PropertyCard property={property} />
                    </div>
                  ))}
                </div>
              </div>
            </Suspense>
          ) : (
            <div className="text-center py-14 rounded-xl border border-dashed bg-muted/30">
              <p className="text-muted-foreground">{L.home_featured_empty}</p>
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Link href="/properties">
              <Button variant="outline" className="w-full gap-2">
                {L.home_view_all}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 text-center">
            <div className="space-y-4">
              <div className="bg-primary-foreground/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto ring-1 ring-primary-foreground/20">
                <Star className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold">{L.home_trust_quality_title}</h3>
              <p className="text-primary-foreground/85 text-sm leading-relaxed max-w-xs mx-auto">
                {L.home_trust_quality_body}
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-primary-foreground/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto ring-1 ring-primary-foreground/20">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold">{L.home_trust_concierge_title}</h3>
              <p className="text-primary-foreground/85 text-sm leading-relaxed max-w-xs mx-auto">
                {L.home_trust_concierge_body}
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-primary-foreground/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto ring-1 ring-primary-foreground/20">
                <MapPin className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold">{L.home_trust_location_title}</h3>
              <p className="text-primary-foreground/85 text-sm leading-relaxed max-w-xs mx-auto">
                {L.home_trust_location_body}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-2xl md:text-4xl font-bold mb-4 text-gray-900">
            {tx("cta_title", "home_cta_title")}
          </h2>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            {tx("cta_subtitle", "home_cta_subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link href="/properties">
              <Button size="lg" className="w-full sm:w-auto min-w-[200px]">
                {tx("cta_properties", "home_cta_properties")}
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[200px]">
                {tx("cta_contact", "home_cta_contact")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LodgingBusiness',
            name: 'Punta Norte Rentals',
            description: 'Plataforma de renta vacacional con casas y departamentos frente al mar en Punta Norte, México. Reserva directa con disponibilidad en tiempo real y pagos seguros.',
            url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            image: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/og-image.png`,
            address: { '@type': 'PostalAddress', addressCountry: 'MX', addressRegion: 'Punta Norte' },
            priceRange: '$$',
            amenityFeature: [
              { '@type': 'LocationFeatureSpecification', name: 'Reserva directa', value: true },
              { '@type': 'LocationFeatureSpecification', name: 'Pagos seguros con Stripe', value: true },
              { '@type': 'LocationFeatureSpecification', name: 'Disponibilidad en tiempo real', value: true },
              { '@type': 'LocationFeatureSpecification', name: 'Atención personalizada', value: true },
            ],
            mainEntityOfPage: { '@type': 'WebPage', '@id': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000' },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Cómo reservar una propiedad en Punta Norte Rentals?',
                acceptedAnswer: { '@type': 'Answer', text: 'Selecciona tu propiedad, elige las fechas en el calendario de disponibilidad en tiempo real, completa tus datos y realiza el pago seguro con Stripe. Recibirás confirmación inmediata por email.' },
              },
              {
                '@type': 'Question',
                name: '¿Cuál es la política de cancelación?',
                acceptedAnswer: { '@type': 'Answer', text: 'Cada propiedad tiene su propia política de cancelación especificada en la página de detalle. Puedes modificar tu reserva desde el panel de reservas con tu token de acceso.' },
              },
              {
                '@type': 'Question',
                name: '¿Dónde están ubicadas las propiedades de Punta Norte Rentals?',
                acceptedAnswer: { '@type': 'Answer', text: 'Todas nuestras propiedades están ubicadas en Punta Norte, México. Ofrecemos casas y departamentos vacacionales con acceso a playa, vistas al mar y amenidades completas.' },
              },
              {
                '@type': 'Question',
                name: '¿Qué métodos de pago aceptan?',
                acceptedAnswer: { '@type': 'Answer', text: 'Aceptamos pagos seguros con tarjeta de crédito y débito a través de Stripe. Los pagos se procesan de forma encriptada y segura.' },
              },
            ],
          }),
        }}
      />
    </div>
  );
}
