import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Compass } from 'lucide-react';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const m = messages[locale];
  return {
    title: m.page_services_title,
    description: m.page_services_meta,
  };
}

/**
 * Experiencias / servicios — esqueleto para futuras extensiones.
 */
export default async function ServicesPage() {
  const locale = await getServerLocale();
  const m = messages[locale];

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/50 to-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center">
        <div className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm p-10 sm:p-14">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 mb-6">
            <Compass className="w-9 h-9 text-orange-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {m.page_services_title}
          </h1>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto">
            {m.page_services_intro}
          </p>
          <div className="mt-10">
            <Button
              asChild
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              <Link href="/properties">{m.home_cta_properties}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
