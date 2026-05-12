import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Compass, ExternalLink } from 'lucide-react';
import { getAdminServices } from '@/lib/firebase-admin-queries';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const m = messages[locale];
  return {
    title: m.page_services_title,
    description: m.page_services_meta,
  };
}

export default async function ServicesPage() {
  const locale = await getServerLocale();
  const m = messages[locale];

  const services = await getAdminServices();

  return (
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
      </div>
    </div>
  );
}
