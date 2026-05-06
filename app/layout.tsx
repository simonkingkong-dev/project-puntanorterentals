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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Punta Norte Rentals - Propiedades Vacacionales',
    template: '%s | Punta Norte Rentals',
  },
  description: 'Descubre propiedades vacacionales excepcionales en destinos únicos.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@PuntaNorteRentals',
    images: ['/og-image.png'],
  },
  openGraph: {
    siteName: 'Punta Norte Rentals',
    type: 'website',
    locale: 'es_MX',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Punta Norte Rentals - Experiencias vacacionales excepcionales',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className={`${inter.className} min-h-screen flex flex-col bg-gray-50`}>
        
        {children}
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  );
}