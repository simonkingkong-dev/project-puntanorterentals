import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import Analytics from '@/components/analytics';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Punta Norte Rentals - Propiedades Vacacionales en México',
    template: '%s | Punta Norte Rentals',
  },
  description: 'Reserva propiedades vacacionales en Punta Norte, México. Casas y departamentos frente al mar con reserva directa y pagos seguros. Check-in flexible, disponibilidad en tiempo real.',
  keywords: ['propiedades vacacionales', 'renta vacacional', 'Punta Norte', 'México', 'casa de playa', 'departamento vacacional', 'vacation rental Mexico'],
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
    title: 'Punta Norte Rentals - Propiedades Vacacionales en México',
    description: 'Casas y departamentos vacacionales en Punta Norte, México. Reserva directa con pagos seguros.',
    images: ['/og-image.png'],
  },
  openGraph: {
    siteName: 'Punta Norte Rentals',
    type: 'website',
    locale: 'es_MX',
    url: siteUrl,
    title: 'Punta Norte Rentals - Propiedades Vacacionales en México',
    description: 'Reserva propiedades vacacionales en Punta Norte, México. Casas y departamentos frente al mar con reserva directa y pagos seguros.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Punta Norte Rentals - Propiedades vacacionales en México',
      },
    ],
  },
};

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
      description: 'Plataforma de renta vacacional con propiedades frente al mar en Punta Norte, México.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
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