import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { ArrowRight, MapPin, Quote, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchFormClient from "@/components/search-form-client";
import PropertyCard from "@/components/ui/property-card";
import HeroBackgroundRotator from "@/components/public/hero-background-rotator";
import {
  getFeaturedPropertiesAdmin,
  getSiteContentBySectionAdmin,
  getAdminTestimonials,
} from "@/lib/firebase-admin-queries";
import { getServerLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/messages";
import { contentMap, pickSiteContent } from "@/lib/site-content-localization";

export const dynamic = "force-dynamic";

const getCachedFeaturedProperties = unstable_cache(
  async () => getFeaturedPropertiesAdmin(),
  ["homepage-featured-properties"],
  { revalidate: 300, tags: ["properties"] }
);

const getCachedHomepageContent = unstable_cache(
  async () => getSiteContentBySectionAdmin("homepage"),
  ["homepage-content"],
  { revalidate: 300, tags: ["site-content"] }
);

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const title =
    locale === "en"
      ? "Punta Norte Rentals - Vacation Rentals in Mexico"
      : "Punta Norte Rentals - Propiedades Vacacionales en México";
  const description =
    locale === "en"
      ? "Vacation homes and apartments in Punta Norte, Mexico. Direct booking with live availability, secure Stripe payments, and personalized support."
      : "Casas y departamentos vacacionales en Punta Norte, México. Reserva directa con disponibilidad en tiempo real, pagos seguros con Stripe y atención personalizada.";
  const keywords =
    locale === "en"
      ? ["Punta Norte vacation rental", "Mexico beach house", "vacation rental Mexico", "vacation homes", "Mexico vacation apartment"]
      : ["renta vacacional Punta Norte", "casa playa México", "vacation rental Mexico", "propiedades vacacionales", "departamento vacacional México"];

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: "/",
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const locale = await getServerLocale();
  const L = messages[locale];

  const [featuredProperties, homepageContent, testimonials] = await Promise.all([
    getCachedFeaturedProperties(),
    getCachedHomepageContent(),
    getAdminTestimonials(),
  ]);

  const c = contentMap(homepageContent);
  const tx = (cmsKey: string, i18nKey: keyof (typeof messages)[Locale]) =>
    pickSiteContent(c, cmsKey, locale, L[i18nKey]);
  const heroCoverImageFallback =
    c.hero_cover_image?.trim() ||
    "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop";
  const heroCoverImages = c.hero_cover_images
    ? c.hero_cover_images
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    : [heroCoverImageFallback];
  const businessDescription =
    locale === "en"
      ? "Vacation rental platform with beachfront homes and apartments in Punta Norte, Mexico. Direct booking with live availability and secure payments."
      : "Plataforma de renta vacacional con casas y departamentos frente al mar en Punta Norte, México. Reserva directa con disponibilidad en tiempo real y pagos seguros.";
  const businessFeatures =
    locale === "en"
      ? ["Direct booking", "Secure Stripe payments", "Live availability", "Personalized support"]
      : ["Reserva directa", "Pagos seguros con Stripe", "Disponibilidad en tiempo real", "Atención personalizada"];
  const faqItems =
    locale === "en"
      ? [
          {
            question: "How do I book a property with Punta Norte Rentals?",
            answer:
              "Select your property, choose dates on the live availability calendar, enter your details, and pay securely with Stripe. You will receive email confirmation.",
          },
          {
            question: "What is the cancellation policy?",
            answer:
              "Each property has its own cancellation policy on the detail page. You can modify your booking from the reservations page with your access token.",
          },
          {
            question: "Where are Punta Norte Rentals properties located?",
            answer:
              "Our properties are located in Punta Norte, Mexico. We offer vacation homes and apartments with beach access, ocean views, and complete amenities.",
          },
          {
            question: "What payment methods do you accept?",
            answer:
              "We accept secure credit and debit card payments through Stripe. Payments are encrypted and processed securely.",
          },
        ]
      : [
          {
            question: "¿Cómo reservar una propiedad en Punta Norte Rentals?",
            answer:
              "Selecciona tu propiedad, elige las fechas en el calendario de disponibilidad en tiempo real, completa tus datos y realiza el pago seguro con Stripe. Recibirás confirmación por email.",
          },
          {
            question: "¿Cuál es la política de cancelación?",
            answer:
              "Cada propiedad tiene su propia política de cancelación especificada en la página de detalle. Puedes modificar tu reserva desde el panel de reservas con tu token de acceso.",
          },
          {
            question: "¿Dónde están ubicadas las propiedades de Punta Norte Rentals?",
            answer:
              "Todas nuestras propiedades están ubicadas en Punta Norte, México. Ofrecemos casas y departamentos vacacionales con acceso a playa, vistas al mar y amenidades completas.",
          },
          {
            question: "¿Qué métodos de pago aceptan?",
            answer:
              "Aceptamos pagos seguros con tarjeta de crédito y débito a través de Stripe. Los pagos se procesan de forma encriptada y segura.",
          },
        ];

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative min-h-[520px] sm:min-h-[600px] flex items-center justify-center">
        <div className="absolute inset-0">
          <HeroBackgroundRotator images={heroCoverImages} intervalMs={20000} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-white min-h-[520px] sm:min-h-[600px] flex flex-col justify-center py-10 sm:py-12 md:py-14">
          <div className="text-center mt-10 sm:mt-14 md:mt-20">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-white/80 mb-4">
              Punta Norte Rentals
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 max-w-4xl mx-auto leading-tight">
              {tx("hero_title", "home_hero_title")}
            </h1>
            <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-white/90 leading-relaxed">
              {tx("hero_subtitle", "home_hero_subtitle")}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-background py-6 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
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

      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900">
              {L.home_testimonials_title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {L.home_testimonials_subtitle}
            </p>
          </div>

          {testimonials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  className="bg-background rounded-xl p-6 shadow-sm border flex flex-col gap-4"
                >
                  <Quote className="h-6 w-6 text-primary/40 shrink-0" />
                  <p className="text-muted-foreground leading-relaxed flex-1 text-sm">{t.text}</p>
                  <div className="flex items-center gap-3 pt-2 border-t">
                    {t.image ? (
                      <Image
                        src={t.image}
                        alt={t.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{t.name}</p>
                      {t.location && (
                        <p className="text-xs text-muted-foreground truncate">{t.location}</p>
                      )}
                    </div>
                    <div className="ml-auto flex gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl border border-dashed bg-background/80">
              <p className="text-muted-foreground">{L.home_testimonials_empty}</p>
            </div>
          )}
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
            description: businessDescription,
            url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            image: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/og-image.png`,
            address: { '@type': 'PostalAddress', addressCountry: 'MX', addressRegion: 'Punta Norte' },
            priceRange: '$$',
            amenityFeature: businessFeatures.map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true })),
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
            mainEntity: faqItems.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          }),
        }}
      />
    </div>
  );
}
