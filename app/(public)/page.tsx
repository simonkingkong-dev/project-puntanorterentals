import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, Quote, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchFormClient from "@/components/search-form-client";
import PropertyCard from "@/components/ui/property-card";
import ServiceCard from "@/components/ui/service-card";
import {
  getFeaturedPropertiesAdmin,
  getFeaturedServicesAdmin,
  getSiteContentBySectionAdmin,
  getAdminTestimonials,
} from "@/lib/firebase-admin-queries";
import { getServerLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

function contentMap(items: { key: string; value: string }[]) {
  return Object.fromEntries(items.map((i) => [i.key, i.value]));
}

export default async function HomePage() {
  const locale = await getServerLocale();
  const L = messages[locale];

  const [featuredProperties, featuredServices, homepageContent, testimonials] = await Promise.all([
    getFeaturedPropertiesAdmin(),
    getFeaturedServicesAdmin(),
    getSiteContentBySectionAdmin("homepage"),
    getAdminTestimonials(),
  ]);

  const c = contentMap(homepageContent);
  const tx = (cmsKey: string, i18nKey: keyof (typeof messages)[Locale]) =>
    c[cmsKey]?.trim() || L[i18nKey];

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative min-h-[520px] sm:min-h-[600px] flex items-center justify-center">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop"
            alt=""
            fill
            className="object-cover brightness-[0.45]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
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
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10 md:mb-12">
            <div className="max-w-2xl">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
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

      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900">
              {tx("features_title", "home_services_title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {tx("features_subtitle", "home_services_subtitle")}
            </p>
          </div>

          {featuredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl border border-dashed bg-background/80">
              <p className="text-muted-foreground">{L.home_services_empty}</p>
            </div>
          )}
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
            <Link href="/contact">
              <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[200px]">
                {tx("cta_contact", "home_cta_contact")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
