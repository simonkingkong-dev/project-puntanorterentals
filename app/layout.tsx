import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Casa Alkimia - Propiedades Vacacionales de Lujo',
    template: '%s | Casa Alkimia'
  },
  description: 'Descubre propiedades vacacionales excepcionales en destinos únicos. Experiencias inolvidables te esperan en Casa Alkimia.',
  keywords: ['vacaciones', 'alquiler', 'propiedades', 'turismo', 'hospedaje'],
  authors: [{ name: 'Casa Alkimia Team' }],
  creator: 'Casa Alkimia',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://casaalkimia.com',
    siteName: 'Casa Alkimia',
    title: 'Casa Alkimia - Propiedades Vacacionales de Lujo',
    description: 'Descubre propiedades vacacionales excepcionales en destinos únicos.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Casa Alkimia - Propiedades Vacacionales',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Casa Alkimia - Propiedades Vacacionales de Lujo',
    description: 'Descubre propiedades vacacionales excepcionales en destinos únicos.',
    images: ['/og-image.jpg'],
    creator: '@casaalkimia',
  },
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className={`${inter.className} min-h-screen flex flex-col bg-gray-50`}>
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}