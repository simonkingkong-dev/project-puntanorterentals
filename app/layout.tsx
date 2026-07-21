import './globals.css';
import type { Metadata, Viewport } from 'next';
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
      },
      {
        '@type': 'FAQPage',
        mainEntity: locale === 'en'
          ? [
              {
                '@type': 'Question',
                name: 'Where are Punta Norte Rentals properties located?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Our properties are located in Isla Mujeres, Quintana Roo, Mexico. Most are near Punta Norte (the northern tip of the island), Playa Norte (one of the Caribbean\'s top beaches), and the Hidalgo pedestrian street in the town center.',
                },
              },
              {
                '@type': 'Question',
                name: 'What types of vacation rentals are available in Isla Mujeres?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'We offer studios for 2–3 guests (from $44 USD/night), private rooms, family apartments for up to 5 guests, and the full La Casa Naranja house for groups of up to 14 people (from $225 USD/night).',
                },
              },
              {
                '@type': 'Question',
                name: 'How do I book a vacation rental in Isla Mujeres?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'You can book directly on our website at puntanorterentals.com with no extra fees. We accept USD, MXN, and EUR. Live availability is shown in real time.',
                },
              },
            ]
          : [
              {
                '@type': 'Question',
                name: '¿Dónde están ubicadas las propiedades de Punta Norte Rentals?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Nuestras propiedades están en Isla Mujeres, Quintana Roo, México. La mayoría se encuentran cerca de Punta Norte (el extremo norte de la isla), Playa Norte y la peatonal Hidalgo en el centro del pueblo.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Qué tipos de rentas vacacionales hay en Isla Mujeres?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Ofrecemos estudios para 2–3 huéspedes (desde $44 USD/noche), habitaciones privadas, apartamentos familiares para hasta 5 personas y La Casa Naranja completa para grupos de hasta 14 personas (desde $225 USD/noche).',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cómo reservo una renta vacacional en Isla Mujeres?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Puede reservar directamente en puntanorterentals.com sin comisiones adicionales. Aceptamos USD, MXN y EUR. La disponibilidad se muestra en tiempo real.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Hay estudios cerca de la peatonal Hidalgo en Isla Mujeres?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sí, contamos con estudios y apartamentos en el centro de Isla Mujeres, a pocos pasos de la peatonal Hidalgo y Playa Norte. Ideales para parejas o familias pequeñas.',
                },
              },
            ],
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