import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Punta Norte Rentals - Propiedades Vacacionales',
    template: '%s | Punta Norte Rentals',
  },
  description: 'Descubre propiedades vacacionales excepcionales en destinos únicos.',
  twitter: {
    card: 'summary_large_image',
    site: '@PuntaNorteRentals',
  },
  openGraph: {
    siteName: 'Punta Norte Rentals',
    type: 'website',
    locale: 'es_MX',
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
      </body>
    </html>
  );
}