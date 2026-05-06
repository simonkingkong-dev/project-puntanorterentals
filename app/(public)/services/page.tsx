import type { Metadata } from 'next';
import { Compass } from 'lucide-react';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';
import { getAdminServices } from '@/lib/firebase-admin-queries';
import ServiceCard from '@/components/ui/service-card';

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

  const allServices = await getAdminServices();
  const featured = allServices.filter(s => s.featured);
  const rest = allServices.filter(s => !s.featured);
  const services = [...featured, ...rest];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      {/* Hero */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 mb-5">
            <Compass className="w-9 h-9 text-orange-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            {m.page_services_title}
          </h1>
          <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
            {m.page_services_meta}
          </p>
        </div>
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
            <p className="mt-2 text-gray-500">{m.page_services_intro}</p>
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
                    {locale === 'en' ? 'More experiences' : 'Más experiencias'}
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
