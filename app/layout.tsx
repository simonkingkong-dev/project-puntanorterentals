import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import Analytics from '@/components/analytics';
import { getServerLocale } from '@/lib/i18n/server';
import { ISLA_MUJERES_POIS_ES, ISLA_MUJERES_POIS_EN } from '@/lib/seo-entities';
import { getHomeFaq } from '@/lib/home-faq';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/** Helps sticky/static chrome behave consistently on Safari / notch devices */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const title =
    locale === 'en'
      ? 'Vacation Rentals in Isla Mujeres | Punta Norte Rentals'
      : 'Rentas Vacacionales en Isla Mujeres | Punta Norte Rentals';
  const description =
    locale === 'en'
      ? 'Apartments and studios for rent in Isla Mujeres, Mexico. Near Playa Norte, Punta Norte, and Hidalgo pedestrian street. From $44 USD/night. Direct booking, no fees.'
      : 'Apartamentos y estudios en renta en Isla Mujeres, México. Cerca de Playa Norte, Punta Norte y la peatonal Hidalgo. Desde $44 USD/noche. Reserva directa, sin comisiones.';

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: '%s | Punta Norte Rentals',
    },
    description,
    keywords:
      locale === 'en'
        ? [
            'vacation rentals Isla Mujeres',
            'Punta Norte rentals',
            'apartments near Playa Norte',
            'studio Isla Mujeres',
            'family apartment Isla Mujeres',
            'vacation rental near Hidalgo street',
            'Isla Mujeres accommodation',
            'Mexico Caribbean vacation rental',
            'Quintana Roo vacation apartments',
            'downtown Isla Mujeres lodging',
            'apartments steps from Playa Media Luna',
            'rentals near the Ferry Ultramar dock',
            'walkable vacation rentals Isla Mujeres',
            '3-bedroom vacation house Isla Mujeres',
            'private rooms for couples Isla Mujeres',
            'direct booking alternative to Airbnb Isla Mujeres',
          ]
        : [
            'rentas en Isla Mujeres',
            'rentas en Punta Norte',
            'rentas zona céntrica Isla Mujeres',
            'estudio en Isla Mujeres',
            'estudio cerca de peatonal Hidalgo',
            'apartamentos cerca de Playa Norte',
            'apartamentos familiares Isla Mujeres',
            'renta vacacional Isla Mujeres',
            'La Casa Naranja Isla Mujeres',
            'hospedaje en el centro de Isla Mujeres',
            'departamentos a metros de Playa Media Luna',
            'rentas cerca del ferry Ultramar',
            'casa de 3 habitaciones Isla Mujeres',
            'habitaciones privadas céntricas Isla Mujeres',
            'renta vacacional directa Isla Mujeres',
            'alternativa a Airbnb en Isla Mujeres',
          ],
    authors: [{ name: 'Punta Norte Rentals' }],
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    icons: {
      icon: [
        { url: '/favicon.ico?v=6', sizes: 'any' },
        { url: '/favicon.png?v=6', type: 'image/png', sizes: '512x512' },
      ],
      shortcut: '/favicon.ico?v=6',
      apple: [{ url: '/apple-touch-icon.png?v=6', sizes: '180x180', type: 'image/png' }],
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
            ? 'Vacation rental platform in Isla Mujeres, Mexico. Studios and apartments near Playa Norte and Hidalgo pedestrian street.'
            : 'Plataforma de renta vacacional en Isla Mujeres, México. Estudios y apartamentos cerca de Playa Norte y la peatonal Hidalgo.',
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
      {
        '@type': 'LodgingBusiness',
        '@id': `${siteUrl}/#lodging`,
        name: 'Punta Norte Rentals',
        url: siteUrl,
        image: `${siteUrl}/og-image.png`,
        description:
          locale === 'en'
            ? 'Vacation apartments and studios in Isla Mujeres, Mexico. Near Playa Norte, Punta Norte, and Hidalgo pedestrian street. Book direct from $44 USD/night.'
            : 'Apartamentos y estudios vacacionales en Isla Mujeres, México. Cerca de Playa Norte, Punta Norte y la peatonal Hidalgo. Reserva directa desde $44 USD/noche.',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Isla Mujeres',
          addressRegion: 'Quintana Roo',
          addressCountry: 'MX',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 21.2365,
          longitude: -86.7320,
        },
        priceRange: '$44 - $225 USD/noche',
        currenciesAccepted: 'USD, MXN, EUR',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.4',
          reviewCount: '2855',
          bestRating: '5',
          worstRating: '1',
        },
        amenityFeature: [
          { '@type': 'LocationFeatureSpecification', name: locale === 'en' ? 'Air conditioning' : 'Aire acondicionado', value: true },
          { '@type': 'LocationFeatureSpecification', name: locale === 'en' ? 'Equipped kitchen' : 'Cocina equipada', value: true },
          { '@type': 'LocationFeatureSpecification', name: locale === 'en' ? 'Balcony' : 'Balcón', value: true },
          { '@type': 'LocationFeatureSpecification', name: locale === 'en' ? 'Private bathroom' : 'Baño privado', value: true },
        ],
        numberOfRooms: '9',
        starRating: { '@type': 'Rating', ratingValue: '4' },
        nearbyAttraction: (locale === 'en' ? ISLA_MUJERES_POIS_EN : ISLA_MUJERES_POIS_ES).map(
          (name) => ({ '@type': 'TouristAttraction', name })
        ),
        knowsAbout:
          locale === 'en'
            ? ['Isla Mujeres vacation rentals', 'Punta Norte neighborhood', 'Playa Norte area lodging']
            : ['rentas vacacionales en Isla Mujeres', 'zona de Punta Norte', 'hospedaje cerca de Playa Norte'],
      },
      {
        '@type': 'FAQPage',
        // Misma fuente que la sección visible de FAQ en la home (lib/home-faq.ts):
        // el schema siempre coincide con el contenido que ve el huésped.
        mainEntity: getHomeFaq(locale).map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
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