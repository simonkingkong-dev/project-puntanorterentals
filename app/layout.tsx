import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import Analytics from '@/components/analytics';
import { getServerLocale } from '@/lib/i18n/server';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const title =
    locale === 'en'
      ? 'Punta Norte Rentals - Vacation Rentals in Mexico'
      : 'Punta Norte Rentals - Propiedades Vacacionales en México';
  const description =
    locale === 'en'
      ? 'Book vacation homes in Punta Norte, Mexico. Beachfront houses and apartments with direct booking, secure payments, flexible check-in, and live availability.'
      : 'Reserva propiedades vacacionales en Punta Norte, México. Casas y departamentos frente al mar con reserva directa, pagos seguros, check-in flexible y disponibilidad en tiempo real.';

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: '%s | Punta Norte Rentals',
    },
    description,
    keywords:
      locale === 'en'
        ? ['vacation rentals', 'Punta Norte rental', 'Mexico beach house', 'vacation apartment', 'vacation rental Mexico']
        : ['propiedades vacacionales', 'renta vacacional', 'Punta Norte', 'México', 'casa de playa', 'departamento vacacional', 'vacation rental Mexico'],
    authors: [{ name: 'Punta Norte Rentals' }],
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    icons: {
      icon: '/favicon.png',
      shortcut: '/favicon.png',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@PuntaNorteRentals',
      title,
      description,
      images: ['/og-image.png'],
    },
    openGraph: {
      siteName: 'Punta Norte Rentals',
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'es_MX',
      url: siteUrl,
      title,
      description,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Punta Norte Rentals',
        url: siteUrl,
        logo: { '@type': 'ImageObject', url: `${siteUrl}/logo.png` },
        sameAs: ['https://www.instagram.com/puntanorterentals', 'https://www.facebook.com/puntanorterentals'],
        description:
          locale === 'en'
            ? 'Vacation rental platform with beachfront properties in Punta Norte, Mexico.'
            : 'Plataforma de renta vacacional con propiedades frente al mar en Punta Norte, México.',
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Punta Norte Rentals',
        publisher: { '@id': `${siteUrl}/#organization` },
        inLanguage: ['es-MX', 'en'],
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/properties?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang={locale} className={inter.variable}>
      <body className={`${inter.className} min-h-screen flex flex-col bg-gray-50`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  );
}